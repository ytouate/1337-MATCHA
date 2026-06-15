from unittest.mock import MagicMock, patch

import pytest

from src.services import oauth_service


@pytest.fixture(autouse=True)
def oauth_env(monkeypatch):
    monkeypatch.setenv("FORTY_TWO_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("FORTY_TWO_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv(
        "FORTY_TWO_REDIRECT_URI",
        "http://localhost:7001/api/auth/oauth/42/callback",
    )
    monkeypatch.setattr(oauth_service, "FORTY_TWO_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(oauth_service, "FORTY_TWO_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setattr(
        oauth_service,
        "FORTY_TWO_REDIRECT_URI",
        "http://localhost:7001/api/auth/oauth/42/callback",
    )


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.oauth_service.PgDatabase", return_value=instance)


def _mock_httpx_client():
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.__exit__.return_value = False
    mock_client.post.return_value = MagicMock(
        status_code=200,
        json=lambda: {"access_token": "42-access-token"},
    )
    mock_client.get.return_value = MagicMock(
        status_code=200,
        json=lambda: {
            "id": 42,
            "login": "student",
            "email": "student@student.42.fr",
            "first_name": "Ada",
            "last_name": "Lovelace",
        },
    )
    return mock_client


class TestOAuthStart:
    def test_oauth_42_redirects_and_sets_state_cookie(self, client):
        response = client.get("/api/auth/oauth/42", follow_redirects=False)

        assert response.status_code == 302
        assert response.headers["location"].startswith(
            "https://api.intra.42.fr/oauth/authorize"
        )
        assert "client_id=test-client-id" in response.headers["location"]
        assert "oauth_state" in response.cookies

    def test_oauth_42_returns_503_when_not_configured(self, client, monkeypatch):
        monkeypatch.setattr(oauth_service, "FORTY_TWO_CLIENT_ID", None)

        response = client.get("/api/auth/oauth/42", follow_redirects=False)

        assert response.status_code == 503


class TestOAuthCallback:
    def test_callback_creates_user_and_sets_auth_cookies(self, client, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [
            None,
            None,
            None,
            {
                "id": 7,
                "email": "student@student.42.fr",
                "username": "student",
                "is_verified": True,
            },
        ]

        with (
            _patch_pg(mock_pg_cursor),
            patch("httpx.Client", return_value=_mock_httpx_client()),
            patch("src.services.oauth_service._issue_tokens") as issue_tokens,
        ):
            issue_tokens.return_value = {
                "access_token": "jwt-access",
                "refresh_token": "jwt-refresh",
            }
            response = client.get(
                "/api/auth/oauth/42/callback?code=abc&state=csrf-state",
                cookies={"oauth_state": "csrf-state"},
                follow_redirects=False,
            )

        assert response.status_code == 302
        assert response.headers["location"] == "http://localhost:9998"
        assert response.cookies.get("access_token") == "jwt-access"
        assert response.cookies.get("refresh_token") == "jwt-refresh"

    def test_callback_logs_in_existing_linked_identity(self, client, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {
            "id": 3,
            "email": "student@student.42.fr",
            "username": "student",
            "is_verified": True,
        }

        with (
            _patch_pg(mock_pg_cursor),
            patch("httpx.Client", return_value=_mock_httpx_client()),
            patch("src.services.oauth_service._issue_tokens") as issue_tokens,
        ):
            issue_tokens.return_value = {
                "access_token": "jwt-access",
                "refresh_token": "jwt-refresh",
            }
            response = client.get(
                "/api/auth/oauth/42/callback?code=abc&state=csrf-state",
                cookies={"oauth_state": "csrf-state"},
                follow_redirects=False,
            )

        assert response.status_code == 302
        assert response.cookies.get("access_token") == "jwt-access"
        cursor.execute.assert_called()

    def test_callback_links_verified_email_account(self, client, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [
            None,
            {
                "id": 5,
                "email": "student@student.42.fr",
                "username": "existing",
                "is_verified": True,
            },
        ]

        with (
            _patch_pg(mock_pg_cursor),
            patch("httpx.Client", return_value=_mock_httpx_client()),
            patch("src.services.oauth_service._issue_tokens") as issue_tokens,
        ):
            issue_tokens.return_value = {
                "access_token": "jwt-access",
                "refresh_token": "jwt-refresh",
            }
            response = client.get(
                "/api/auth/oauth/42/callback?code=abc&state=csrf-state",
                cookies={"oauth_state": "csrf-state"},
                follow_redirects=False,
            )

        assert response.status_code == 302
        assert response.cookies.get("access_token") == "jwt-access"

    def test_callback_rejects_invalid_state(self, client):
        response = client.get(
            "/api/auth/oauth/42/callback?code=abc&state=wrong",
            cookies={"oauth_state": "csrf-state"},
            follow_redirects=False,
        )

        assert response.status_code == 302
        assert "oauth_error=" in response.headers["location"]
        assert "access_token" not in response.cookies

    def test_callback_rejects_unverified_email_conflict(self, client, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [
            None,
            {
                "id": 5,
                "email": "student@student.42.fr",
                "username": "existing",
                "is_verified": False,
            },
        ]

        with (
            _patch_pg(mock_pg_cursor),
            patch("httpx.Client", return_value=_mock_httpx_client()),
        ):
            response = client.get(
                "/api/auth/oauth/42/callback?code=abc&state=csrf-state",
                cookies={"oauth_state": "csrf-state"},
                follow_redirects=False,
            )

        assert response.status_code == 302
        assert "oauth_error=" in response.headers["location"]
        assert "not%20verified" in response.headers["location"].lower()

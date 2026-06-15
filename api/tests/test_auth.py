from datetime import timedelta
from unittest.mock import ANY, MagicMock, patch

import pytest

from src.core.security import generate_jwt_token, hash_password, verify_password


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.auth_service.PgDatabase", return_value=instance)


class TestSignup:
    def test_signup_success(self, client, valid_signup_payload, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [None, None]

        with (
            _patch_pg(mock_pg_cursor),
            patch("src.services.auth_service.DatabaseHelper.create_row") as create_row,
            patch(
                "src.services.auth_service.email_service.queue_verification_email"
            ) as queue_email,
        ):
            response = client.post("/api/auth/signup", json=valid_signup_payload)

        assert response.status_code == 200
        assert response.json() == {"message": "User successfully registered"}
        create_row.assert_called_once()
        queue_email.assert_called_once()

    def test_signup_resends_verification_for_unverified_email(
        self, client, valid_signup_payload, mock_pg_cursor
    ):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"is_verified": False}

        with (
            _patch_pg(mock_pg_cursor),
            patch(
                "src.services.auth_service.email_service.queue_verification_email"
            ) as queue_email,
        ):
            response = client.post("/api/auth/signup", json=valid_signup_payload)

        assert response.status_code == 200
        assert "Verification email sent" in response.json()["message"]
        queue_email.assert_called_once()

    @pytest.mark.parametrize(
        "missing_field",
        ["email", "username", "last_name", "first_name", "password"],
    )
    def test_signup_rejects_missing_required_field(
        self, client, valid_signup_payload, missing_field
    ):
        payload = {**valid_signup_payload}
        del payload[missing_field]

        response = client.post("/api/auth/signup", json=payload)

        assert response.status_code == 422

    def test_signup_schema_includes_required_fields(self):
        from src.schemas.auth import SignupData

        required = {"email", "username", "last_name", "first_name", "password"}
        schema_fields = set(SignupData.model_fields.keys())

        assert required.issubset(schema_fields)

    def test_signup_stores_hashed_password(
        self, client, valid_signup_payload, mock_pg_cursor
    ):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [None, None]
        stored = {}

        def capture_row(table, data):
            stored.update(data)

        with (
            _patch_pg(mock_pg_cursor),
            patch(
                "src.services.auth_service.DatabaseHelper.create_row",
                side_effect=capture_row,
            ),
            patch("src.services.auth_service.email_service.queue_verification_email"),
        ):
            client.post("/api/auth/signup", json=valid_signup_payload)

        assert stored["password"].startswith("$2b$")
        assert verify_password("Xk9@mQz2", stored["password"])

    def test_signup_rejects_dictionary_password(self, client, valid_signup_payload):
        payload = {**valid_signup_payload, "password": "Password1!"}

        response = client.post("/api/auth/signup", json=payload)

        assert response.status_code == 422
        assert "dictionary" in response.text.lower()

    def test_signup_queues_verification_email(
        self, client, valid_signup_payload, mock_pg_cursor
    ):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [None, None]

        with (
            _patch_pg(mock_pg_cursor),
            patch("src.services.auth_service.DatabaseHelper.create_row"),
            patch(
                "src.services.auth_service.email_service.queue_verification_email"
            ) as queue_email,
        ):
            client.post("/api/auth/signup", json=valid_signup_payload)

        queue_email.assert_called_once()
        args = queue_email.call_args[0]
        assert args[0] == valid_signup_payload["email"]


class TestPasswordPolicy:
    def test_passwords_are_bcrypt_hashed(self):
        hashed = hash_password("Xk9@mQz2")

        assert hashed != "Xk9@mQz2"
        assert hashed.startswith("$2b$")
        assert verify_password("Xk9@mQz2", hashed)

    def test_rejects_common_dictionary_word(self):
        from src.core.password_policy import validate_password

        with pytest.raises(ValueError, match="dictionary"):
            validate_password("Password1!")

    def test_reset_password_rejects_dictionary_password(self, client):
        response = client.post(
            "/api/auth/reset-password/some-token",
            json={"new_password": "Password1!"},
        )

        assert response.status_code == 422
        assert "dictionary" in response.text.lower()


class TestEmailVerification:
    def test_email_verification_marks_user_verified(self, client):
        token = generate_jwt_token(
            type="email_verification",
            data={"email": "test@example.com"},
            expires_delta=timedelta(hours=24),
        )

        with patch(
            "src.services.auth_service.DatabaseHelper.update_database_value",
            return_value=True,
        ) as update_value:
            response = client.get(
                f"/api/auth/email-verification?token={token}",
                follow_redirects=False,
            )

        assert response.status_code == 301
        assert response.headers["location"] == "http://localhost:9998?verified=1"
        update_value.assert_called_once()


class TestSignin:
    def test_signin_with_username(self, client, verified_user, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = verified_user

        with _patch_pg(mock_pg_cursor):
            response = client.post(
                "/api/auth/signin",
                json={"login": "testuser", "password": "Xk9@mQz2"},
            )

        assert response.status_code == 200
        assert response.json()["user"]["username"] == "testuser"
        set_cookie_headers = response.headers.get_list("set-cookie")
        assert any("access_token=" in header for header in set_cookie_headers)

    def test_signin_with_email(self, client, verified_user, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = verified_user

        with _patch_pg(mock_pg_cursor):
            response = client.post(
                "/api/auth/signin",
                json={"login": "test@example.com", "password": "Xk9@mQz2"},
            )

        assert response.status_code == 200
        assert response.json()["user"]["email"] == "test@example.com"

    def test_signin_rejects_invalid_credentials(
        self, client, verified_user, mock_pg_cursor
    ):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = verified_user

        with _patch_pg(mock_pg_cursor):
            response = client.post(
                "/api/auth/signin",
                json={"login": "testuser", "password": "WrongPass1!"},
            )

        assert response.status_code == 401
        assert response.json()["error"] == "Invalid credentials"

    def test_signin_rejects_unverified_email(
        self, client, verified_user, mock_pg_cursor
    ):
        cursor, _, _ = mock_pg_cursor
        unverified = {**verified_user, "is_verified": False}
        cursor.fetchone.return_value = unverified

        with _patch_pg(mock_pg_cursor):
            response = client.post(
                "/api/auth/signin",
                json={"login": "testuser", "password": "Xk9@mQz2"},
            )

        assert response.status_code == 401
        assert response.json()["error"] == "Email not verified"


class TestPasswordReset:
    def test_forgot_password_queues_reset_email(self, client):
        with (
            patch(
                "src.services.auth_service.DatabaseHelper.field_exists",
                return_value=True,
            ),
            patch(
                "src.services.auth_service.email_service.queue_password_reset_email"
            ) as queue_reset,
        ):
            response = client.post(
                "/api/auth/forgot-password",
                json={"email": "test@example.com"},
            )

        assert response.status_code == 200
        assert response.json()["message"] == "Password reset link sent"
        queue_reset.assert_called_once_with("test@example.com", ANY)

    def test_forgot_password_returns_404_for_unknown_email(self, client):
        with patch(
            "src.services.auth_service.DatabaseHelper.field_exists",
            return_value=False,
        ):
            response = client.post(
                "/api/auth/forgot-password",
                json={"email": "missing@example.com"},
            )

        assert response.status_code == 404

    def test_reset_password_with_valid_token(self, client, mock_pg_cursor):
        _, connection, _ = mock_pg_cursor
        token = generate_jwt_token(
            type="password_reset",
            data={"email": "test@example.com"},
            expires_delta=timedelta(hours=1),
        )

        with _patch_pg(mock_pg_cursor):
            response = client.post(
                f"/api/auth/reset-password/{token}",
                json={"new_password": "Nw9@mQz7"},
            )

        assert response.status_code == 200
        assert response.json()["message"] == "Password reset successfully"
        connection.commit.assert_called_once()


class TestSignout:
    def test_signout_clears_auth_cookies(self, client):
        client.cookies.set("access_token", "fake-access")
        client.cookies.set("refresh_token", "fake-refresh")

        response = client.post("/api/auth/signout")

        assert response.status_code == 200
        assert response.json()["message"] == "Successfully signed out"

        set_cookie_headers = response.headers.get_list("set-cookie")
        cookie_header_text = " ".join(set_cookie_headers).lower()
        assert "access_token=" in cookie_header_text
        assert "refresh_token=" in cookie_header_text

    def test_me_requires_authentication(self, client):
        response = client.get("/api/auth/me")

        assert response.status_code == 401

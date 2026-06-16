from unittest.mock import ANY, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.test_auth import _patch_pg
from tests.test_profile import _patch_pg as _patch_user_pg
from src.services import user_service


class TestSigninSecurity:
    def test_signin_response_excludes_password(
        self, client, verified_user, mock_pg_cursor
    ):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = verified_user

        with _patch_pg(mock_pg_cursor):
            response = client.post(
                "/api/auth/signin",
                json={"login": "testuser", "password": "Xk9@mQz2"},
            )

        assert response.status_code == 200
        assert "password" not in response.json()["user"]


class TestSignupSecurity:
    def test_signup_uses_parameterized_insert(
        self, client, valid_signup_payload, mock_pg_cursor
    ):
        cursor, connection, db_ctx = mock_pg_cursor
        cursor.fetchone.side_effect = [None, None]

        with (
            _patch_pg(mock_pg_cursor),
            patch("src.services.auth_service.email_service.queue_verification_email"),
        ):
            response = client.post("/api/auth/signup", json=valid_signup_payload)

        assert response.status_code == 200
        insert_call = next(
            call
            for call in cursor.execute.call_args_list
            if "INSERT INTO users" in call.args[0]
        )
        query = insert_call.args[0]
        params = insert_call.args[1]
        assert "%(" in query
        assert "' OR 1=1" not in query
        assert params["username"] == valid_signup_payload["username"]
        connection.commit.assert_called_once()


class TestForgotPasswordSecurity:
    def test_forgot_password_same_response_for_unknown_email(self, client):
        with patch(
            "src.services.auth_service.DatabaseHelper.field_exists",
            return_value=False,
        ):
            response = client.post(
                "/api/auth/forgot-password",
                json={"email": "missing@example.com"},
            )

        assert response.status_code == 200
        assert "If an account exists" in response.json()["message"]

    def test_forgot_password_queues_email_for_known_user(self, client):
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
        queue_reset.assert_called_once_with("test@example.com", ANY)


class TestUploadSecurity:
    def test_upload_rejects_large_file_without_content_length(self):
        from src.core.deps import get_current_user
        from src.main import app

        large_payload = b"x" * (5 * 1024 * 1024 + 1)
        test_client = TestClient(app, raise_server_exceptions=False)

        app.dependency_overrides[get_current_user] = lambda: {
            "email": "test@example.com",
            "user_id": 1,
        }
        try:
            response = test_client.post(
                "/api/upload",
                files={"files": ("photo.jpg", large_payload, "image/jpeg")},
            )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 400
        assert "too large" in response.json()["detail"].lower()


class TestPublicProfilePrivacy:
    def test_public_profile_excludes_email_password_and_coords(self, mock_pg_cursor):
        cursor, _, db_ctx = mock_pg_cursor
        target_user = {
            "id": 2,
            "username": "bob",
            "first_name": "Bob",
            "last_name": "B",
            "gender": "Male",
            "bio": "Hello there bio",
            "sexual_preference": "Female",
            "latitude": 48.8566,
            "longitude": 2.3522,
            "location_label": "Paris",
            "birthdate": None,
            "is_verified": True,
            "is_profile_completed": True,
            "fame_rating": 1,
            "last_seen_at": None,
        }
        cursor.fetchone.side_effect = [{"id": 2}, target_user, None, None]
        cursor.fetchall.side_effect = [[], []]

        with (
            _patch_user_pg(mock_pg_cursor),
            patch("src.services.moderation_service.is_blocked", return_value=False),
            patch("src.services.social_service.record_profile_view"),
            patch(
                "src.services.social_service.get_viewer_context",
                return_value={
                    "is_liked_by_viewer": False,
                    "has_liked_viewer": False,
                    "is_connected": False,
                    "is_blocked": False,
                },
            ),
        ):
            profile = user_service.get_user_by_username("bob", viewer_id=1)

        assert "email" not in profile
        assert "password" not in profile
        assert profile["latitude"] is None
        assert profile["longitude"] is None

    def test_anonymous_profile_excludes_email(self, mock_pg_cursor):
        cursor, _, db_ctx = mock_pg_cursor
        target_user = {
            "id": 2,
            "username": "bob",
            "first_name": "Bob",
            "last_name": "B",
            "gender": "Male",
            "bio": "Hello there bio",
            "sexual_preference": "Female",
            "latitude": 48.8566,
            "longitude": 2.3522,
            "location_label": "Paris",
            "birthdate": None,
            "is_verified": True,
            "is_profile_completed": True,
            "fame_rating": 1,
            "last_seen_at": None,
        }
        cursor.fetchone.side_effect = [{"id": 2}, target_user, None]
        cursor.fetchall.side_effect = [[], []]

        with _patch_user_pg(mock_pg_cursor):
            profile = user_service.get_user_by_username("bob", viewer_id=None)

        assert "email" not in profile
        assert "password" not in profile


class TestGeocodePrivacy:
    def test_geocode_requires_authentication(self, client):
        response = client.post(
            "/api/location/geocode",
            json={"query": "Paris"},
        )
        assert response.status_code == 401

    def test_build_location_label_uses_city_not_full_address(self):
        from src.services.location_service import _build_location_label

        label = _build_location_label(
            {
                "display_name": "10 Rue de Rivoli, Paris, France",
                "address": {"city": "Paris", "country": "France"},
            },
            "Paris",
        )
        assert label == "Paris"


class TestDatePrivacy:
    def test_serialized_date_omits_coordinates(self):
        from src.services.date_service import _serialize_date

        row = {
            "id": 1,
            "proposer_id": 1,
            "invitee_id": 2,
            "status": "proposed",
            "scheduled_at": "2026-06-20T18:00:00",
            "location_label": "Cafe",
            "latitude": 48.8566,
            "longitude": 2.3522,
            "note": None,
            "created_at": "2026-06-01T12:00:00",
            "updated_at": "2026-06-01T12:00:00",
            "responded_at": None,
            "invitee_username": "bob",
            "invitee_first_name": "Bob",
            "invitee_last_name": "B",
            "invitee_profile_picture": None,
        }

        payload = _serialize_date(row, viewer_id=1)
        assert "latitude" not in payload
        assert "longitude" not in payload
        assert payload["location_label"] == "Cafe"

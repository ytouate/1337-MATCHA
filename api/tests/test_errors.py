from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


class TestGlobalErrorHandling:
    def test_unhandled_exception_returns_safe_response(self):
        from src.main import app

        client = TestClient(app, raise_server_exceptions=False)
        with patch(
            "src.api.endpoints.interests.user_service.list_interests",
            side_effect=RuntimeError("internal secret"),
        ):
            response = client.get("/api/interests")

        assert response.status_code == 500
        body = response.json()
        assert body["detail"] == "An unexpected error occurred. Please try again later."
        assert "internal secret" not in response.text
        assert "traceback" not in response.text.lower()

    def test_signin_uses_detail_field(self, client, verified_user, mock_pg_cursor):
        from tests.test_auth import _patch_pg

        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = verified_user

        with _patch_pg(mock_pg_cursor):
            response = client.post(
                "/api/auth/signin",
                json={"login": "testuser", "password": "WrongPass1!"},
            )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"
        assert "error" not in response.json()

    @pytest.mark.parametrize("missing_field", ["email", "username", "password"])
    def test_validation_errors_return_422(self, client, missing_field):
        payload = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "Xk9@mQz2",
            "first_name": "Test",
            "last_name": "User",
            "gender": "Male",
            "birthdate": "2000-01-15",
        }
        del payload[missing_field]

        response = client.post("/api/auth/signup", json=payload)

        assert response.status_code == 422
        assert "detail" in response.json()

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from src.services import moderation_service


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.moderation_service.PgDatabase", return_value=instance)


class TestModeration:
    def test_block_user(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"id": 2}

        with _patch_pg(mock_pg_cursor):
            with patch(
                "src.services.notification_service.delete_notifications_between"
            ):
                result = moderation_service.block_user(1, "blocked")

        assert result["message"] == "User blocked"

    def test_report_user(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"id": 2}

        with _patch_pg(mock_pg_cursor):
            result = moderation_service.report_user(1, "fake", "Looks fake")

        assert result["message"] == "Report submitted"

    def test_is_blocked_symmetric(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"exists": True}

        assert moderation_service.is_blocked(cursor, 1, 2) is True

    def test_cannot_block_self(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"id": 1}

        with _patch_pg(mock_pg_cursor):
            with pytest.raises(HTTPException) as exc:
                moderation_service.block_user(1, "selfuser")

        assert exc.value.status_code == 400

    def test_get_blocked_users(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchall.return_value = [
            {
                "username": "blocked",
                "first_name": "Bob",
                "last_name": "Blocked",
                "profile_picture": None,
                "blocked_at": "2026-01-01T12:00:00",
            }
        ]

        with _patch_pg(mock_pg_cursor):
            result = moderation_service.get_blocked_users(1)

        assert len(result) == 1
        assert result[0]["username"] == "blocked"

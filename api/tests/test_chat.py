from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from src.services import chat_service


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.chat_service.PgDatabase", return_value=instance)


class TestChat:
    def test_send_message_requires_connection(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"id": 2}

        with _patch_pg(mock_pg_cursor):
            with patch(
                "src.services.chat_service.is_blocked", return_value=False
            ):
                with patch(
                    "src.services.chat_service.is_connected", return_value=False
                ):
                    with pytest.raises(HTTPException) as exc:
                        chat_service.send_message(1, "other", "Hello")

        assert exc.value.status_code == 403

    def test_send_message_blocked(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"id": 2}

        with _patch_pg(mock_pg_cursor):
            with patch("src.services.chat_service.is_blocked", return_value=True):
                with pytest.raises(HTTPException) as exc:
                    chat_service.send_message(1, "other", "Hello")

        assert exc.value.status_code == 403

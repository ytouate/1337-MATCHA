from unittest.mock import patch

from src.services import notification_service


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    from unittest.mock import MagicMock

    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch(
        "src.services.notification_service.PgDatabase", return_value=instance
    )


class TestNotifications:
    def test_skips_notification_when_blocked(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor

        with patch(
            "src.services.notification_service.is_blocked", return_value=True
        ):
            result = notification_service.create_notification(
                cursor, 1, 2, "like", {}
            )

        assert result is None
        cursor.execute.assert_not_called()

    def test_unread_count(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"count": 3}

        with _patch_pg(mock_pg_cursor):
            count = notification_service.unread_count(1)

        assert count == 3

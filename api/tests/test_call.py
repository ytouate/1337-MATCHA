from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

import pytest
from fastapi import HTTPException

from src.services import call_service


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.call_service.PgDatabase", return_value=instance)


class TestRelayCallEvent:
    def test_invite_relays_to_connected_peer(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [{"id": 2}, {"username": "alice"}]

        with (
            _patch_pg(mock_pg_cursor),
            patch("src.services.call_service.is_blocked", return_value=False),
            patch("src.services.call_service.is_connected", return_value=True),
            patch(
                "src.services.call_service.ws_manager.send_to_user",
                new_callable=AsyncMock,
            ) as send_to_user,
        ):
            asyncio.run(
                call_service.relay_call_event(
                    1,
                    "call.invite",
                    {"username": "bob", "call_id": "call-123"},
                )
            )

        send_to_user.assert_awaited_once_with(
            2,
            "call.incoming",
            {"call_id": "call-123", "from_username": "alice"},
        )

    def test_rejects_when_not_connected(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [{"id": 2}, {"username": "alice"}]

        with (
            _patch_pg(mock_pg_cursor),
            patch("src.services.call_service.is_blocked", return_value=False),
            patch("src.services.call_service.is_connected", return_value=False),
        ):
            with pytest.raises(HTTPException) as exc:
                asyncio.run(
                    call_service.relay_call_event(
                        1,
                        "call.invite",
                        {"username": "bob", "call_id": "call-123"},
                    )
                )

        assert exc.value.status_code == 403

    def test_rejects_when_blocked(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [{"id": 2}, {"username": "alice"}]

        with (
            _patch_pg(mock_pg_cursor),
            patch("src.services.call_service.is_blocked", return_value=True),
            patch("src.services.call_service.is_connected", return_value=True),
        ):
            with pytest.raises(HTTPException) as exc:
                asyncio.run(
                    call_service.relay_call_event(
                        1,
                        "call.invite",
                        {"username": "bob", "call_id": "call-123"},
                    )
                )

        assert exc.value.status_code == 403

    def test_offer_requires_sdp(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [{"id": 2}, {"username": "alice"}]

        with (
            _patch_pg(mock_pg_cursor),
            patch("src.services.call_service.is_blocked", return_value=False),
            patch("src.services.call_service.is_connected", return_value=True),
        ):
            with pytest.raises(HTTPException) as exc:
                asyncio.run(
                    call_service.relay_call_event(
                        1,
                        "call.offer",
                        {"username": "bob", "call_id": "call-123"},
                    )
                )

        assert exc.value.status_code == 400

from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from starlette.websockets import WebSocketDisconnect

from src.core.security import generate_jwt_token


def _patch_ws_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.api.endpoints.ws.PgDatabase", return_value=instance)


class TestWebSocket:
    def test_ping_returns_pong(self, client, mock_pg_cursor):
        token = generate_jwt_token(
            type="access_token",
            data={"user_id": 1, "username": "testuser"},
            expires_delta=timedelta(hours=1),
        )

        with _patch_ws_pg(mock_pg_cursor):
            with client.websocket_connect(f"/api/ws?token={token}") as ws:
                ws.send_json({"event": "ping", "data": {}})
                assert ws.receive_json() == {"event": "pong", "data": {}}

    def test_unauthenticated_connection_is_rejected(self, client):
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect("/api/ws"):
                pass

        assert exc_info.value.code == 4401

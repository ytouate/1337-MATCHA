import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(user_id, None)

    def is_connected(self, user_id: int) -> bool:
        return bool(self._connections.get(user_id))

    async def send_to_user(self, user_id: int, event: str, data: dict[str, Any]) -> None:
        message = json.dumps({"event": event, "data": data})
        for websocket in list(self._connections.get(user_id, set())):
            try:
                await websocket.send_text(message)
            except Exception:
                self.disconnect(user_id, websocket)


ws_manager = ConnectionManager()

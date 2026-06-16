import json
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from src.core.config import IS_PRODUCTION, JWT_ALGORITHM, JWT_SECRET_KEY
from src.db.database import PgDatabase
from src.services import chat_service
from src.services.call_service import CALL_EVENT_MAP, relay_call_event
from src.services.presence_service import mark_offline, mark_online, touch_last_seen
from src.services.ws_manager import ws_manager

router = APIRouter(tags=["WebSocket"])


def _decode_ws_user(websocket: WebSocket) -> dict | None:
    token = websocket.cookies.get("access_token")
    if not token and not IS_PRODUCTION:
        token = websocket.query_params.get("token")
    if not token:
        return None
    try:
        payload = jwt.decode(
            token=token, key=JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        if payload.get("type") != "access_token":
            return None
        return payload.get("data")
    except JWTError:
        return None


async def _send_error(websocket: WebSocket, detail: str) -> None:
    await websocket.send_json({"event": "error", "data": {"detail": detail}})


@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    user_data = _decode_ws_user(websocket)
    if not user_data:
        await websocket.close(code=4401)
        return

    user_id = user_data["user_id"]
    await ws_manager.connect(user_id, websocket)
    mark_online(user_id)

    with PgDatabase() as db:
        touch_last_seen(db, user_id)

    try:
        while True:
            try:
                raw = await websocket.receive_text()
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    await _send_error(websocket, "Invalid JSON payload")
                    continue

                event = payload.get("event")
                data: dict[str, Any] = payload.get("data") or {}

                if event == "ping":
                    await websocket.send_json({"event": "pong", "data": {}})
                    continue

                if event == "chat.history":
                    peer_username = data.get("username")
                    if not peer_username:
                        await _send_error(websocket, "username is required")
                        continue
                    try:
                        messages = chat_service.get_messages(user_id, peer_username)
                        await websocket.send_json(
                            {
                                "event": "chat.history",
                                "data": {
                                    "username": peer_username,
                                    "messages": messages,
                                },
                            }
                        )
                    except HTTPException as exc:
                        await _send_error(websocket, str(exc.detail))

                elif event == "chat.send":
                    receiver_username = data.get("username")
                    body = data.get("body", "")
                    if not receiver_username or not body:
                        await _send_error(websocket, "username and body are required")
                        continue
                    try:
                        message = chat_service.send_message(
                            user_id, receiver_username, body
                        )
                        await websocket.send_json(
                            {
                                "event": "chat.message",
                                "data": {
                                    "username": receiver_username,
                                    "message": message,
                                },
                            }
                        )
                    except HTTPException as exc:
                        await _send_error(websocket, str(exc.detail))

                elif event in CALL_EVENT_MAP:
                    try:
                        await relay_call_event(user_id, event, data)
                    except HTTPException as exc:
                        await _send_error(websocket, str(exc.detail))

            except Exception:
                await _send_error(
                    websocket, "An unexpected error occurred. Please try again."
                )

    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(user_id, websocket)
        mark_offline(user_id)
        with PgDatabase() as db:
            touch_last_seen(db, user_id)

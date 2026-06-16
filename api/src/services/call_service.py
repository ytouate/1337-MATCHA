from typing import Any

from fastapi import HTTPException

from src.db.database import PgDatabase
from src.services.moderation_service import is_blocked
from src.services.social_service import is_connected
from src.services.ws_manager import ws_manager

CALL_EVENT_MAP = {
    "call.invite": "call.incoming",
    "call.accept": "call.accepted",
    "call.reject": "call.rejected",
    "call.offer": "call.offer",
    "call.answer": "call.answer",
    "call.ice": "call.ice",
    "call.hangup": "call.ended",
}


def _get_user_id_by_username(db, username: str) -> int:
    db.cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    row = db.cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row["id"]


def _get_username_by_id(db, user_id: int) -> str:
    db.cursor.execute("SELECT username FROM users WHERE id = %s", (user_id,))
    row = db.cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row["username"]


def _ensure_can_call(db, sender_id: int, receiver_id: int) -> None:
    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot call yourself")
    if is_blocked(db, sender_id, receiver_id):
        raise HTTPException(status_code=403, detail="Calling is not allowed")
    if not is_connected(db, sender_id, receiver_id):
        raise HTTPException(
            status_code=403,
            detail="You must be connected to call this user",
        )


async def relay_call_event(
    sender_id: int, client_event: str, data: dict[str, Any]
) -> None:
    if client_event not in CALL_EVENT_MAP:
        raise HTTPException(status_code=400, detail="Unsupported call event")

    peer_username = data.get("username")
    call_id = data.get("call_id")
    if not peer_username or not call_id:
        raise HTTPException(status_code=400, detail="username and call_id are required")

    with PgDatabase() as db:
        peer_id = _get_user_id_by_username(db, peer_username)
        _ensure_can_call(db, sender_id, peer_id)
        sender_username = _get_username_by_id(db, sender_id)

    relay_event = CALL_EVENT_MAP[client_event]
    relay_data = {
        "call_id": call_id,
        "from_username": sender_username,
    }

    if client_event in {"call.offer", "call.answer"}:
        sdp = data.get("sdp")
        if not sdp:
            raise HTTPException(status_code=400, detail="sdp is required")
        relay_data["sdp"] = sdp

    if client_event == "call.ice":
        candidate = data.get("candidate")
        if candidate is None:
            raise HTTPException(status_code=400, detail="candidate is required")
        relay_data["candidate"] = candidate

    await ws_manager.send_to_user(peer_id, relay_event, relay_data)

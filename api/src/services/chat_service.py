from datetime import date, datetime
from typing import Any, Optional

from fastapi import HTTPException, status

from src.db.database import PgDatabase
from src.services.moderation_service import is_blocked
from src.services.social_service import is_connected, user_has_profile_picture


def _serialize_dt(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _serialize_message(row: dict, viewer_id: int) -> dict:
    return {
        "id": row["id"],
        "body": row["body"],
        "created_at": _serialize_dt(row["created_at"]),
        "read_at": _serialize_dt(row.get("read_at")),
        "is_mine": row["sender_id"] == viewer_id,
        "sender_username": row["sender_username"],
    }


def _get_user_id_by_username(db, username: str) -> int:
    db.cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    row = db.cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row["id"]


def _ensure_can_chat(db, sender_id: int, receiver_id: int) -> None:
    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    if is_blocked(db, sender_id, receiver_id):
        raise HTTPException(status_code=403, detail="Messaging is not allowed")
    if not is_connected(db, sender_id, receiver_id):
        raise HTTPException(
            status_code=403,
            detail="You must be connected to chat with this user",
        )
    if not user_has_profile_picture(db, sender_id):
        raise HTTPException(
            status_code=403,
            detail="Add a profile picture before sending messages",
        )


def get_messages(
    user_id: int,
    other_username: str,
    limit: int = 50,
    before_id: Optional[int] = None,
) -> list[dict]:
    with PgDatabase() as db:
        other_id = _get_user_id_by_username(db, other_username)
        _ensure_can_chat(db, user_id, other_id)

        params: list = [user_id, other_id, other_id, user_id]
        before_sql = ""
        if before_id is not None:
            before_sql = " AND m.id < %s"
            params.append(before_id)
        params.append(limit)

        db.cursor.execute(
            f"""
            SELECT m.id, m.sender_id, m.receiver_id, m.body, m.created_at, m.read_at,
                   u.username AS sender_username
            FROM chat_messages m
            JOIN users u ON u.id = m.sender_id
            WHERE ((m.sender_id = %s AND m.receiver_id = %s)
                OR (m.sender_id = %s AND m.receiver_id = %s))
            {before_sql}
            ORDER BY m.created_at DESC
            LIMIT %s
            """,
            tuple(params),
        )
        rows = db.cursor.fetchall()
        return [
            _serialize_message(row, user_id)
            for row in reversed(rows)
        ]


def send_message(sender_id: int, receiver_username: str, body: str) -> dict:
    trimmed = body.strip()
    if not trimmed:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(trimmed) > 2000:
        raise HTTPException(status_code=400, detail="Message too long")

    with PgDatabase() as db:
        receiver_id = _get_user_id_by_username(db, receiver_username)
        _ensure_can_chat(db, sender_id, receiver_id)

        db.cursor.execute(
            """
            INSERT INTO chat_messages (sender_id, receiver_id, body)
            VALUES (%s, %s, %s)
            RETURNING id, sender_id, receiver_id, body, created_at, read_at
            """,
            (sender_id, receiver_id, trimmed),
        )
        message = db.cursor.fetchone()

        db.cursor.execute(
            "SELECT username FROM users WHERE id = %s", (sender_id,)
        )
        sender_username = db.cursor.fetchone()["username"]

        from src.services import notification_service

        notification_service.create_and_push_notification(
            receiver_id,
            sender_id,
            "message",
            {"username": sender_username, "preview": trimmed[:120]},
        )

    message_row = {**message, "sender_username": sender_username}
    message_payload = _serialize_message(message_row, receiver_id)

    _push_chat_message(receiver_id, sender_username, message_payload)
    return _serialize_message(message_row, sender_id)


def _push_chat_message(
    recipient_id: int, peer_username: str, message: dict
) -> None:
    from src.services.notification_service import schedule_async
    from src.services.ws_manager import ws_manager

    schedule_async(
        ws_manager.send_to_user(
            recipient_id,
            "chat.message",
            {"username": peer_username, "message": message},
        )
    )

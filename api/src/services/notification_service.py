import asyncio
import json
from datetime import date, datetime
from typing import Any, Optional

from src.db.database import PgDatabase
from src.services.moderation_service import is_blocked
from src.services.user_service import _image_public_url

_app_loop: asyncio.AbstractEventLoop | None = None


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _app_loop
    _app_loop = loop


def _serialize_dt(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _serialize_notification(row: dict) -> dict:
    payload = row.get("payload")
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            payload = {}
    elif payload is None:
        payload = {}

    profile_picture = row.get("actor_profile_picture")
    return {
        "id": row["id"],
        "type": row["type"],
        "payload": payload,
        "read_at": _serialize_dt(row.get("read_at")),
        "created_at": _serialize_dt(row["created_at"]),
        "actor": {
            "username": row["actor_username"],
            "first_name": row["actor_first_name"],
            "last_name": row["actor_last_name"],
            "profile_picture": (
                _image_public_url(profile_picture) if profile_picture else None
            ),
        },
    }


def create_notification(
    db,
    recipient_id: int,
    actor_id: int,
    notif_type: str,
    payload: Optional[dict[str, Any]] = None,
) -> Optional[dict]:
    if recipient_id == actor_id:
        return None
    if is_blocked(db, recipient_id, actor_id):
        return None

    db.cursor.execute(
        """
        INSERT INTO notifications (recipient_id, actor_id, type, payload)
        VALUES (%s, %s, %s, %s)
        RETURNING id, recipient_id, actor_id, type, payload, read_at, created_at
        """,
        (recipient_id, actor_id, notif_type, json.dumps(payload or {})),
    )
    row = db.cursor.fetchone()
    return dict(row) if row else None


async def push_notification(recipient_id: int, notification_row: dict) -> None:
    from src.services.ws_manager import ws_manager

    db_row = {**notification_row, "actor_username": "", "actor_first_name": "", "actor_last_name": ""}
    await ws_manager.send_to_user(
        recipient_id,
        "notification.new",
        {"notification": _serialize_notification(db_row) if False else notification_row},
    )


def create_and_push_notification(
    recipient_id: int,
    actor_id: int,
    notif_type: str,
    payload: Optional[dict[str, Any]] = None,
) -> None:
    with PgDatabase() as db:
        row = create_notification(db, recipient_id, actor_id, notif_type, payload)
        if not row:
            return
        notification = _fetch_notification_by_id(db, row["id"])
    if notification:
        _schedule_push(recipient_id, notification)


def _schedule_push(recipient_id: int, notification: dict) -> None:
    from src.services.ws_manager import ws_manager

    coro = ws_manager.send_to_user(
        recipient_id, "notification.new", {"notification": notification}
    )

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
        return
    except RuntimeError:
        pass

    if _app_loop and _app_loop.is_running():
        asyncio.run_coroutine_threadsafe(coro, _app_loop)


def _fetch_notification_by_id(db, notification_id: int) -> Optional[dict]:
    db.cursor.execute(
        """
        SELECT n.id, n.type, n.payload, n.read_at, n.created_at,
               u.username AS actor_username,
               u.first_name AS actor_first_name,
               u.last_name AS actor_last_name,
               img.url AS actor_profile_picture
        FROM notifications n
        JOIN users u ON u.id = n.actor_id
        LEFT JOIN images img ON img.user_id = u.id AND img.is_profile_picture = true
        WHERE n.id = %s
        """,
        (notification_id,),
    )
    row = db.cursor.fetchone()
    return _serialize_notification(row) if row else None


def delete_notifications_between(db, user_a: int, user_b: int) -> None:
    db.cursor.execute(
        """
        DELETE FROM notifications
        WHERE (recipient_id = %s AND actor_id = %s)
           OR (recipient_id = %s AND actor_id = %s)
        """,
        (user_a, user_b, user_b, user_a),
    )


def list_notifications(user_id: int) -> list[dict]:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT n.id, n.type, n.payload, n.read_at, n.created_at,
                   u.username AS actor_username,
                   u.first_name AS actor_first_name,
                   u.last_name AS actor_last_name,
                   img.url AS actor_profile_picture
            FROM notifications n
            JOIN users u ON u.id = n.actor_id
            LEFT JOIN images img ON img.user_id = u.id AND img.is_profile_picture = true
            WHERE n.recipient_id = %s
            ORDER BY n.created_at DESC
            LIMIT 50
            """,
            (user_id,),
        )
        return [_serialize_notification(row) for row in db.cursor.fetchall()]


def unread_count(user_id: int) -> int:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT COUNT(*) AS count FROM notifications
            WHERE recipient_id = %s AND read_at IS NULL
            """,
            (user_id,),
        )
        return db.cursor.fetchone()["count"]


def mark_read(user_id: int, notification_id: int) -> dict:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            UPDATE notifications SET read_at = CURRENT_TIMESTAMP
            WHERE id = %s AND recipient_id = %s
            RETURNING id
            """,
            (notification_id, user_id),
        )
        if not db.cursor.fetchone():
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification marked as read"}


def mark_all_read(user_id: int) -> dict:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            UPDATE notifications SET read_at = CURRENT_TIMESTAMP
            WHERE recipient_id = %s AND read_at IS NULL
            """,
            (user_id,),
        )
        return {"message": "All notifications marked as read"}

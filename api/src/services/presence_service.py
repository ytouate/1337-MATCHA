from datetime import datetime, timedelta, timezone

ONLINE_WINDOW_MINUTES = 5

_online_user_ids: set[int] = set()


def mark_online(user_id: int) -> None:
    _online_user_ids.add(user_id)


def mark_offline(user_id: int) -> None:
    _online_user_ids.discard(user_id)


def is_user_online(user_id: int, last_seen_at: datetime | None) -> bool:
    if user_id in _online_user_ids:
        return True
    if not last_seen_at:
        return False
    if last_seen_at.tzinfo is None:
        last_seen_at = last_seen_at.replace(tzinfo=timezone.utc)
    threshold = datetime.now(timezone.utc) - timedelta(minutes=ONLINE_WINDOW_MINUTES)
    return last_seen_at >= threshold


def touch_last_seen(db, user_id: int) -> None:
    db.cursor.execute(
        "UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = %s",
        (user_id,),
    )

from datetime import date, datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException

from src.db.database import PgDatabase
from src.services.moderation_service import is_blocked
from src.services.social_service import is_connected
from src.services.user_service import _image_public_url


def _serialize_dt(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _get_user_id_by_username(db, username: str) -> int:
    db.cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    row = db.cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row["id"]


def _ensure_can_schedule(db, user_a: int, user_b: int) -> None:
    if user_a == user_b:
        raise HTTPException(status_code=400, detail="Cannot schedule a date with yourself")
    if is_blocked(db, user_a, user_b):
        raise HTTPException(status_code=403, detail="Scheduling is not allowed")
    if not is_connected(db, user_a, user_b):
        raise HTTPException(
            status_code=403,
            detail="You must be connected to schedule a date with this user",
        )


def _has_pending_proposal(db, user_a: int, user_b: int) -> bool:
    db.cursor.execute(
        """
        SELECT 1 FROM date_proposals
        WHERE status = 'proposed'
          AND (
            (proposer_id = %s AND invitee_id = %s)
            OR (proposer_id = %s AND invitee_id = %s)
          )
        LIMIT 1
        """,
        (user_a, user_b, user_b, user_a),
    )
    return db.cursor.fetchone() is not None


def _notification_payload(row: dict) -> dict:
    return {
        "date_id": row["id"],
        "scheduled_at": _serialize_dt(row["scheduled_at"]),
        "location_label": row.get("location_label"),
    }


def _serialize_peer(row: dict, prefix: str) -> dict:
    profile_picture = row.get(f"{prefix}_profile_picture")
    return {
        "username": row[f"{prefix}_username"],
        "first_name": row[f"{prefix}_first_name"],
        "last_name": row[f"{prefix}_last_name"],
        "profile_picture": (
            _image_public_url(profile_picture) if profile_picture else None
        ),
    }


def _serialize_date(row: dict, viewer_id: int) -> dict:
    is_proposer = row["proposer_id"] == viewer_id
    peer_prefix = "invitee" if is_proposer else "proposer"
    return {
        "id": row["id"],
        "status": row["status"],
        "scheduled_at": _serialize_dt(row["scheduled_at"]),
        "location_label": row.get("location_label"),
        "note": row.get("note"),
        "is_mine": is_proposer,
        "peer": _serialize_peer(row, peer_prefix),
        "created_at": _serialize_dt(row["created_at"]),
        "updated_at": _serialize_dt(row["updated_at"]),
        "responded_at": _serialize_dt(row.get("responded_at")),
    }


_DATE_SELECT = """
    SELECT d.id, d.proposer_id, d.invitee_id, d.status, d.scheduled_at,
           d.location_label, d.latitude, d.longitude, d.note,
           d.created_at, d.updated_at, d.responded_at,
           proposer.username AS proposer_username,
           proposer.first_name AS proposer_first_name,
           proposer.last_name AS proposer_last_name,
           proposer_img.url AS proposer_profile_picture,
           invitee.username AS invitee_username,
           invitee.first_name AS invitee_first_name,
           invitee.last_name AS invitee_last_name,
           invitee_img.url AS invitee_profile_picture
    FROM date_proposals d
    JOIN users proposer ON proposer.id = d.proposer_id
    JOIN users invitee ON invitee.id = d.invitee_id
    LEFT JOIN images proposer_img
      ON proposer_img.user_id = proposer.id AND proposer_img.is_profile_picture = TRUE
    LEFT JOIN images invitee_img
      ON invitee_img.user_id = invitee.id AND invitee_img.is_profile_picture = TRUE
"""


def _get_date_row(db, date_id: int) -> dict:
    db.cursor.execute(
        f"{_DATE_SELECT} WHERE d.id = %s",
        (date_id,),
    )
    row = db.cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Date not found")
    return row


def _ensure_participant(row: dict, user_id: int) -> None:
    if user_id not in (row["proposer_id"], row["invitee_id"]):
        raise HTTPException(status_code=404, detail="Date not found")


def create_proposal(
    proposer_id: int,
    invitee_username: str,
    scheduled_at: datetime,
    location_label: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    note: Optional[str] = None,
) -> dict:
    if scheduled_at.tzinfo is not None:
        scheduled_at = scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)

    now = datetime.utcnow()
    if scheduled_at <= now:
        raise HTTPException(
            status_code=400, detail="scheduled_at must be in the future"
        )

    with PgDatabase() as db:
        invitee_id = _get_user_id_by_username(db, invitee_username)
        _ensure_can_schedule(db, proposer_id, invitee_id)

        if _has_pending_proposal(db, proposer_id, invitee_id):
            raise HTTPException(
                status_code=409,
                detail="A pending date proposal already exists for this connection",
            )

        db.cursor.execute(
            """
            INSERT INTO date_proposals (
                proposer_id, invitee_id, status, scheduled_at,
                location_label, latitude, longitude, note
            )
            VALUES (%s, %s, 'proposed', %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                proposer_id,
                invitee_id,
                scheduled_at,
                location_label,
                latitude,
                longitude,
                note,
            ),
        )
        date_id = db.cursor.fetchone()["id"]
        row = _get_date_row(db, date_id)

        from src.services import notification_service

        notification_service.create_and_push_notification(
            invitee_id,
            proposer_id,
            "date_proposed",
            _notification_payload(row),
        )

    return _serialize_date(row, proposer_id)


def list_dates(user_id: int, upcoming_only: bool = False) -> list[dict]:
    with PgDatabase() as db:
        filters = ["(d.proposer_id = %s OR d.invitee_id = %s)"]
        params: list[Any] = [user_id, user_id]

        if upcoming_only:
            filters.append("d.status = 'accepted'")
            filters.append("d.scheduled_at >= CURRENT_TIMESTAMP")

        where_sql = " AND ".join(filters)
        db.cursor.execute(
            f"""
            {_DATE_SELECT}
            WHERE {where_sql}
            ORDER BY d.scheduled_at ASC
            """,
            tuple(params),
        )
        rows = db.cursor.fetchall()

    return [_serialize_date(row, user_id) for row in rows]


def get_date(user_id: int, date_id: int) -> dict:
    with PgDatabase() as db:
        row = _get_date_row(db, date_id)
        _ensure_participant(row, user_id)
    return _serialize_date(row, user_id)


def accept_date(user_id: int, date_id: int) -> dict:
    with PgDatabase() as db:
        row = _get_date_row(db, date_id)
        _ensure_participant(row, user_id)

        if row["invitee_id"] != user_id:
            raise HTTPException(
                status_code=403, detail="Only the invitee can accept this date"
            )
        if row["status"] != "proposed":
            raise HTTPException(
                status_code=400, detail="Only proposed dates can be accepted"
            )

        db.cursor.execute(
            """
            UPDATE date_proposals
            SET status = 'accepted',
                responded_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (date_id,),
        )
        row = _get_date_row(db, date_id)

        from src.services import notification_service

        notification_service.create_and_push_notification(
            row["proposer_id"],
            user_id,
            "date_accepted",
            _notification_payload(row),
        )

    return _serialize_date(row, user_id)


def decline_date(user_id: int, date_id: int) -> dict:
    with PgDatabase() as db:
        row = _get_date_row(db, date_id)
        _ensure_participant(row, user_id)

        if row["invitee_id"] != user_id:
            raise HTTPException(
                status_code=403, detail="Only the invitee can decline this date"
            )
        if row["status"] != "proposed":
            raise HTTPException(
                status_code=400, detail="Only proposed dates can be declined"
            )

        db.cursor.execute(
            """
            UPDATE date_proposals
            SET status = 'declined',
                responded_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (date_id,),
        )
        row = _get_date_row(db, date_id)

        from src.services import notification_service

        notification_service.create_and_push_notification(
            row["proposer_id"],
            user_id,
            "date_declined",
            _notification_payload(row),
        )

    return _serialize_date(row, user_id)


def cancel_date(user_id: int, date_id: int) -> dict:
    with PgDatabase() as db:
        row = _get_date_row(db, date_id)
        _ensure_participant(row, user_id)

        if row["status"] not in ("proposed", "accepted"):
            raise HTTPException(
                status_code=400,
                detail="Only proposed or accepted dates can be cancelled",
            )

        db.cursor.execute(
            """
            UPDATE date_proposals
            SET status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (date_id,),
        )
        row = _get_date_row(db, date_id)

        recipient_id = (
            row["invitee_id"] if user_id == row["proposer_id"] else row["proposer_id"]
        )

        from src.services import notification_service

        notification_service.create_and_push_notification(
            recipient_id,
            user_id,
            "date_cancelled",
            _notification_payload(row),
        )

    return _serialize_date(row, user_id)

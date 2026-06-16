from fastapi import HTTPException, status

from src.db.database import PgDatabase
from src.services.user_service import _image_public_url


def _serialize_dt(value):
    from datetime import date, datetime

    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def is_blocked(db, user_a: int, user_b: int) -> bool:
    db.cursor.execute(
        """
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = %s AND blocked_id = %s)
           OR (blocker_id = %s AND blocked_id = %s)
        LIMIT 1
        """,
        (user_a, user_b, user_b, user_a),
    )
    return db.cursor.fetchone() is not None


def block_user(blocker_id: int, username: str) -> dict:
    with PgDatabase() as db:
        db.cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        target = db.cursor.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        if target["id"] == blocker_id:
            raise HTTPException(status_code=400, detail="You cannot block yourself")

        db.cursor.execute(
            """
            INSERT INTO user_blocks (blocker_id, blocked_id)
            VALUES (%s, %s)
            ON CONFLICT (blocker_id, blocked_id) DO NOTHING
            """,
            (blocker_id, target["id"]),
        )

        from src.services import notification_service

        notification_service.delete_notifications_between(db, blocker_id, target["id"])

        return {"message": "User blocked"}


def unblock_user(blocker_id: int, username: str) -> dict:
    with PgDatabase() as db:
        db.cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        target = db.cursor.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")

        db.cursor.execute(
            """
            DELETE FROM user_blocks
            WHERE blocker_id = %s AND blocked_id = %s
            """,
            (blocker_id, target["id"]),
        )
        return {"message": "User unblocked"}


def get_blocked_users(blocker_id: int) -> list[dict]:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT u.username, u.first_name, u.last_name,
                   img.url AS profile_picture, ub.created_at AS blocked_at
            FROM user_blocks ub
            JOIN users u ON u.id = ub.blocked_id
            LEFT JOIN images img
              ON img.user_id = u.id AND img.is_profile_picture = TRUE
            WHERE ub.blocker_id = %s
            ORDER BY ub.created_at DESC
            """,
            (blocker_id,),
        )
        rows = db.cursor.fetchall()

    return [
        {
            "username": row["username"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            "profile_picture": (
                _image_public_url(row["profile_picture"])
                if row.get("profile_picture")
                else None
            ),
            "blocked_at": _serialize_dt(row["blocked_at"]),
        }
        for row in rows
    ]


def report_user(reporter_id: int, username: str, reason: str) -> dict:
    with PgDatabase() as db:
        db.cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        target = db.cursor.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        if target["id"] == reporter_id:
            raise HTTPException(status_code=400, detail="You cannot report yourself")

        db.cursor.execute(
            """
            INSERT INTO user_reports (reporter_id, reported_id, reason)
            VALUES (%s, %s, %s)
            """,
            (reporter_id, target["id"], reason[:512]),
        )
        return {"message": "Report submitted"}

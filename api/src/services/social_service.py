"""
Fame rating algorithm (FR-21):
    fame_rating = profile_views_received + likes_received
"""

from typing import Any, Optional

from fastapi import HTTPException

from src.db.database import PgDatabase
from src.services.user_service import _image_public_url


def recalculate_fame_rating(db, user_id: int) -> int:
    db.cursor.execute(
        "SELECT COUNT(*) AS count FROM user_views WHERE viewed_id = %s",
        (user_id,),
    )
    views_count = db.cursor.fetchone()["count"]

    db.cursor.execute(
        "SELECT COUNT(*) AS count FROM user_likes WHERE liked_id = %s",
        (user_id,),
    )
    likes_count = db.cursor.fetchone()["count"]

    fame_rating = views_count + likes_count

    db.cursor.execute(
        "UPDATE users SET fame_rating = %s WHERE id = %s",
        (fame_rating, user_id),
    )
    return fame_rating


def user_has_profile_picture(db, user_id: int) -> bool:
    db.cursor.execute(
        """
        SELECT 1 FROM images
        WHERE user_id = %s AND is_profile_picture = true
        LIMIT 1
        """,
        (user_id,),
    )
    return db.cursor.fetchone() is not None


def has_liked(db, liker_id: int, liked_id: int) -> bool:
    db.cursor.execute(
        """
        SELECT 1 FROM user_likes
        WHERE liker_id = %s AND liked_id = %s
        LIMIT 1
        """,
        (liker_id, liked_id),
    )
    return db.cursor.fetchone() is not None


def is_connected(db, user_a: int, user_b: int) -> bool:
    if user_a == user_b:
        return False
    return has_liked(db, user_a, user_b) and has_liked(db, user_b, user_a)


def record_profile_view(viewer_id: int, viewed_id: int, db=None) -> None:
    if viewer_id == viewed_id:
        return

    if db is None:
        with PgDatabase() as owned_db:
            if _insert_view(owned_db, viewer_id, viewed_id):
                from src.services import notification_service

                notification_service.create_and_push_notification(
                    viewed_id, viewer_id, "view", {}
                )
            recalculate_fame_rating(owned_db, viewed_id)
        return

    if _insert_view(db, viewer_id, viewed_id):
        from src.services import notification_service

        notification_service.create_and_push_notification(
            viewed_id, viewer_id, "view", {}
        )
    recalculate_fame_rating(db, viewed_id)


def _insert_view(db, viewer_id: int, viewed_id: int) -> bool:
    db.cursor.execute(
        """
        INSERT INTO user_views (viewer_id, viewed_id)
        VALUES (%s, %s)
        ON CONFLICT (viewer_id, viewed_id) DO NOTHING
        RETURNING viewer_id
        """,
        (viewer_id, viewed_id),
    )
    return db.cursor.fetchone() is not None


def like_user(liker_id: int, liked_username: str) -> dict:
    with PgDatabase() as db:
        if not user_has_profile_picture(db, liker_id):
            raise HTTPException(
                status_code=403,
                detail="Add a profile picture before liking other profiles",
            )

        db.cursor.execute(
            "SELECT id FROM users WHERE username = %s",
            (liked_username,),
        )
        liked = db.cursor.fetchone()

        if not liked:
            raise HTTPException(status_code=404, detail="User not found")

        if liked["id"] == liker_id:
            raise HTTPException(status_code=400, detail="You cannot like yourself")

        from src.services.moderation_service import is_blocked

        if is_blocked(db, liker_id, liked["id"]):
            raise HTTPException(status_code=403, detail="Action not allowed")

        was_connected = is_connected(db, liker_id, liked["id"])

        db.cursor.execute(
            """
            INSERT INTO user_likes (liker_id, liked_id)
            VALUES (%s, %s)
            ON CONFLICT (liker_id, liked_id) DO NOTHING
            RETURNING liker_id
            """,
            (liker_id, liked["id"]),
        )
        new_like = db.cursor.fetchone() is not None
        fame_rating = recalculate_fame_rating(db, liked["id"])

        db.cursor.execute(
            "SELECT username FROM users WHERE id = %s", (liker_id,)
        )
        liker_row = db.cursor.fetchone()
        liked_id = liked["id"]
        now_connected = is_connected(db, liker_id, liked_id)

    from src.services import notification_service

    if new_like:
        notification_service.create_and_push_notification(
            liked_id, liker_id, "like", {}
        )

    if new_like and now_connected and not was_connected:
        notification_service.create_and_push_notification(
            liker_id, liked_id, "connection", {"username": liked_username}
        )
        notification_service.create_and_push_notification(
            liked_id, liker_id, "connection", {"username": liker_row["username"]}
        )

    return {
        "message": "User liked",
        "fame_rating": fame_rating,
        "is_connected": now_connected,
    }


def unlike_user(liker_id: int, liked_username: str) -> dict:
    with PgDatabase() as db:
        db.cursor.execute(
            "SELECT id FROM users WHERE username = %s",
            (liked_username,),
        )
        liked = db.cursor.fetchone()

        if not liked:
            raise HTTPException(status_code=404, detail="User not found")

        was_connected = is_connected(db, liker_id, liked["id"])

        db.cursor.execute(
            """
            DELETE FROM user_likes
            WHERE liker_id = %s AND liked_id = %s
            """,
            (liker_id, liked["id"]),
        )
        fame_rating = recalculate_fame_rating(db, liked["id"])

        from src.services import notification_service

        if was_connected:
            notification_service.create_and_push_notification(
                liked["id"], liker_id, "unlike", {}
            )

        notification_service.delete_notifications_between(db, liker_id, liked["id"])

        return {
            "message": "Like removed",
            "fame_rating": fame_rating,
            "is_connected": False,
        }


def _social_user_summary(row: dict) -> dict:
    profile_picture = row.get("profile_picture")
    return {
        "username": row["username"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "profile_picture": (
            _image_public_url(profile_picture) if profile_picture else None
        ),
        "fame_rating": row.get("fame_rating") or 0,
        "viewed_at": row.get("viewed_at"),
        "liked_at": row.get("liked_at"),
    }


def get_profile_viewers(user_id: int) -> list[dict]:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT u.username, u.first_name, u.last_name, u.fame_rating,
                   img.url AS profile_picture, uv.viewed_at
            FROM user_views uv
            JOIN users u ON u.id = uv.viewer_id
            LEFT JOIN images img ON img.user_id = u.id AND img.is_profile_picture = true
            WHERE uv.viewed_id = %s
            ORDER BY uv.viewed_at DESC
            """,
            (user_id,),
        )
        return [_social_user_summary(row) for row in db.cursor.fetchall()]


def get_users_who_liked_me(user_id: int) -> list[dict]:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT u.username, u.first_name, u.last_name, u.fame_rating,
                   img.url AS profile_picture, ul.liked_at
            FROM user_likes ul
            JOIN users u ON u.id = ul.liker_id
            LEFT JOIN images img ON img.user_id = u.id AND img.is_profile_picture = true
            WHERE ul.liked_id = %s
            ORDER BY ul.liked_at DESC
            """,
            (user_id,),
        )
        return [_social_user_summary(row) for row in db.cursor.fetchall()]


def get_connections(user_id: int) -> list[dict]:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT u.id, u.username, u.first_name, u.last_name, u.fame_rating,
                   u.last_seen_at,
                   img.url AS profile_picture
            FROM user_likes ul1
            JOIN user_likes ul2
              ON ul1.liked_id = ul2.liker_id AND ul1.liker_id = ul2.liked_id
            JOIN users u ON u.id = ul1.liked_id
            LEFT JOIN images img ON img.user_id = u.id AND img.is_profile_picture = true
            WHERE ul1.liker_id = %s
            ORDER BY u.username
            """,
            (user_id,),
        )
        rows = db.cursor.fetchall()

    from src.services.presence_service import is_user_online

    result = []
    for row in rows:
        summary = _social_user_summary(row)
        summary["is_online"] = is_user_online(row["id"], row.get("last_seen_at"))
        summary["last_seen_at"] = row.get("last_seen_at")
        result.append(summary)
    return result


def get_viewer_context(db, viewer_id: Optional[int], profile_id: int) -> dict[str, Any]:
    if not viewer_id or viewer_id == profile_id:
        return {
            "is_liked_by_viewer": False,
            "has_liked_viewer": False,
            "is_connected": False,
            "is_blocked": False,
        }

    from src.services.moderation_service import is_blocked

    return {
        "is_liked_by_viewer": has_liked(db, viewer_id, profile_id),
        "has_liked_viewer": has_liked(db, profile_id, viewer_id),
        "is_connected": is_connected(db, viewer_id, profile_id),
        "is_blocked": is_blocked(db, viewer_id, profile_id),
    }

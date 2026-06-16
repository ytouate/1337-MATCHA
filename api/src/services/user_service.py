from typing import Any, Optional
from urllib.parse import quote, unquote

from fastapi import BackgroundTasks, HTTPException, Response, status

from src.core.config import API_PUBLIC_URL
from src.db.database import PgDatabase
from src.schemas.user import Gender, UserPut, UserUpdate
from src.services import email_service

PUBLIC_USER_SELECT_FIELDS = """
    id, username, first_name, last_name, gender,
    bio, sexual_preference, latitude, longitude, location_label,
    birthdate, is_verified, is_profile_completed, fame_rating, last_seen_at
"""

OWNER_USER_SELECT_FIELDS = f"""
    {PUBLIC_USER_SELECT_FIELDS.strip()}, email
"""

USER_SELECT_FIELDS = OWNER_USER_SELECT_FIELDS


def _normalize_image_path(url: str) -> str:
    path = url
    api_prefix = f"{API_PUBLIC_URL}/api/images/"
    if path.startswith(api_prefix):
        path = path[len(api_prefix) :]
    elif path.startswith("/api/images/"):
        path = path[len("/api/images/") :]
    return unquote(path)


def _image_public_url(path: str) -> str:
    encoded_path = quote(path, safe="/")
    return f"{API_PUBLIC_URL}/api/images/{encoded_path}"


def _get_user_images(db, user_id: int) -> list[dict]:
    db.cursor.execute(
        """
        SELECT url, is_profile_picture
        FROM images
        WHERE user_id = %s
        ORDER BY sort_order, id
        """,
        (user_id,),
    )
    rows = db.cursor.fetchall()
    return [
        {
            "url": _image_public_url(row["url"]),
            "is_profile_picture": row["is_profile_picture"],
        }
        for row in rows
    ]


def _get_user_interests(db, user_id: int) -> list[str]:
    db.cursor.execute(
        """
        SELECT i.name
        FROM interests i
        JOIN user_interests ui ON ui.interest_id = i.id
        WHERE ui.user_id = %s
        ORDER BY i.name
        """,
        (user_id,),
    )
    return [row["name"] for row in db.cursor.fetchall()]


def _get_profile_picture(db, user_id: int) -> Optional[str]:
    db.cursor.execute(
        """
        SELECT url FROM images
        WHERE user_id = %s AND is_profile_picture = true
        LIMIT 1
        """,
        (user_id,),
    )
    row = db.cursor.fetchone()
    if row:
        return _image_public_url(row["url"])
    return None


def _calculate_age(birthdate) -> Optional[int]:
    if not birthdate:
        return None
    from datetime import date

    today = date.today()
    age = today.year - birthdate.year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        age -= 1
    return age


def _enrich_user_profile(db, user: dict, viewer_id: Optional[int] = None) -> dict:
    user_id = user["id"]
    user["images"] = _get_user_images(db, user_id)
    user["interests"] = _get_user_interests(db, user_id)
    user["profile_picture"] = _get_profile_picture(db, user_id)
    user["fame_rating"] = user.get("fame_rating") or 0
    user["age"] = _calculate_age(user.get("birthdate"))
    if user.get("latitude") is not None:
        user["latitude"] = float(user["latitude"])
    if user.get("longitude") is not None:
        user["longitude"] = float(user["longitude"])

    from src.services import social_service
    from src.services.presence_service import is_user_online

    is_owner = viewer_id is not None and viewer_id == user_id
    user["is_online"] = is_user_online(user_id, user.get("last_seen_at"))

    if is_owner:
        user["is_liked_by_viewer"] = False
        user["has_liked_viewer"] = False
        user["is_connected"] = False
        user["is_blocked"] = False
    elif viewer_id:
        context = social_service.get_viewer_context(db, viewer_id, user_id)
        user.update(context)
        user.pop("email", None)
        user["latitude"] = None
        user["longitude"] = None
    else:
        user["is_liked_by_viewer"] = False
        user["has_liked_viewer"] = False
        user["is_connected"] = False
        user["is_blocked"] = False
        user.pop("email", None)
        user["latitude"] = None
        user["longitude"] = None

    user.pop("birthdate", None)
    return user


def _count_user_images(db, user_id: int) -> int:
    db.cursor.execute(
        "SELECT COUNT(*) AS count FROM images WHERE user_id = %s",
        (user_id,),
    )
    return db.cursor.fetchone()["count"]


def _count_user_interests(db, user_id: int) -> int:
    db.cursor.execute(
        "SELECT COUNT(*) AS count FROM user_interests WHERE user_id = %s",
        (user_id,),
    )
    return db.cursor.fetchone()["count"]


def check_profile_completion(db, user_id: int, user_data: dict) -> bool:
    required_fields = ["gender", "sexual_preference", "bio", "latitude", "longitude"]
    if not all(
        user_data.get(field) is not None and user_data.get(field) != ""
        for field in required_fields
    ):
        return False

    bio = user_data.get("bio")
    if not bio or len(str(bio)) < 10:
        return False

    if _count_user_images(db, user_id) < 1:
        return False

    if _count_user_interests(db, user_id) < 1:
        return False

    return True


def _sync_images(
    db,
    user_id: int,
    images: list[str],
    profile_picture: Optional[str],
) -> None:
    db.cursor.execute("DELETE FROM images WHERE user_id = %s", (user_id,))

    normalized_images = [_normalize_image_path(url) for url in images]
    normalized_profile = (
        _normalize_image_path(profile_picture) if profile_picture else None
    )

    image_insert_query = """
    INSERT INTO images (user_id, url, is_profile_picture, sort_order)
    VALUES (%s, %s, %s, %s)
    """
    for i, image_url in enumerate(normalized_images):
        is_profile = (
            (image_url == normalized_profile) if normalized_profile else (i == 0)
        )
        db.cursor.execute(image_insert_query, (user_id, image_url, is_profile, i))


def _sync_interests(db, user_id: int, interests: list[str]) -> None:
    db.cursor.execute(
        "DELETE FROM user_interests WHERE user_id = %s",
        (user_id,),
    )

    for interest in interests:
        db.cursor.execute("SELECT id FROM interests WHERE name = %s", (interest,))
        result = db.cursor.fetchone()

        if result:
            interest_id = result["id"]
        else:
            db.cursor.execute(
                "INSERT INTO interests (name) VALUES (%s) RETURNING id",
                (interest,),
            )
            interest_id = db.cursor.fetchone()["id"]

        db.cursor.execute(
            """
            INSERT INTO user_interests (user_id, interest_id)
            VALUES (%s, %s)
            """,
            (user_id, interest_id),
        )


def _queue_email_verification_on_email_change(
    email: str, background_tasks: BackgroundTasks
) -> None:
    email_service.queue_verification_email(email, background_tasks)


def _fetch_user_row(db, username: str, *, public_only: bool = False) -> Optional[dict]:
    fields = PUBLIC_USER_SELECT_FIELDS if public_only else OWNER_USER_SELECT_FIELDS
    db.cursor.execute(
        f"""
        SELECT {fields}
        FROM users WHERE username = %s
        """,
        (username,),
    )
    return db.cursor.fetchone()


def get_user_by_username(username: str, viewer_id: Optional[int] = None) -> dict:
    with PgDatabase() as db:
        db.cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        user_ref = db.cursor.fetchone()

        if not user_ref:
            raise HTTPException(status_code=404, detail="User not found")

        public_only = viewer_id is None or viewer_id != user_ref["id"]
        user = _fetch_user_row(db, username, public_only=public_only)

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if viewer_id and viewer_id != user["id"]:
            from src.services import social_service
            from src.services.moderation_service import is_blocked

            if is_blocked(db, viewer_id, user["id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Profile not available",
                )

            social_service.record_profile_view(viewer_id, user["id"], db)

        return _enrich_user_profile(db, user, viewer_id)


def get_user_profile_by_id(user_id: int) -> dict:
    with PgDatabase() as db:
        db.cursor.execute(
            f"""
            SELECT {USER_SELECT_FIELDS}
            FROM users WHERE id = %s
            """,
            (user_id,),
        )
        user = db.cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return _enrich_user_profile(db, user, user_id)


def list_interests() -> list[str]:
    with PgDatabase() as db:
        db.cursor.execute("SELECT name FROM interests ORDER BY name")
        return [row["name"] for row in db.cursor.fetchall()]


def partial_update_user(
    username: str,
    user_data: UserUpdate,
    current_user: dict[str, Any],
    background_tasks: BackgroundTasks,
) -> dict | Response:
    with PgDatabase() as db:
        db.cursor.execute(
            f"""
            SELECT {USER_SELECT_FIELDS}
            FROM users WHERE username = %s
            """,
            (username,),
        )
        user = db.cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user["id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=403, detail="You can only update your own profile"
            )

        update_fields = {
            k: v for k, v in user_data.model_dump().items() if v is not None
        }

        update_fields.pop("username", None)

        images = update_fields.pop("images", None)
        interests = update_fields.pop("interests", None)
        profile_picture = update_fields.pop("profile_picture", None)

        if not update_fields and images is None and interests is None:
            return Response(
                status_code=status.HTTP_304_NOT_MODIFIED, content="No fields to update"
            )

        if "email" in update_fields:
            new_email = update_fields["email"]
            if new_email != user["email"]:
                update_fields["is_verified"] = False
                _queue_email_verification_on_email_change(new_email, background_tasks)
            else:
                update_fields.pop("email")

        if images is not None:
            _sync_images(db, user["id"], images, profile_picture)

        if interests is not None:
            _sync_interests(db, user["id"], interests)

        if update_fields:
            updated_values = dict(user)
            updated_values.update(update_fields)
            update_fields["is_profile_completed"] = check_profile_completion(
                db, user["id"], updated_values
            )

            set_clause = ", ".join(f"{k} = %s" for k in update_fields.keys())
            values = list(update_fields.values())
            values.append(username)

            db.cursor.execute(
                f"""
                UPDATE users
                SET {set_clause}
                WHERE username = %s
                """,
                values,
            )
        else:
            updated_values = dict(user)
            is_completed = check_profile_completion(db, user["id"], updated_values)
            db.cursor.execute(
                """
                UPDATE users SET is_profile_completed = %s WHERE id = %s
                """,
                (is_completed, user["id"]),
            )

        updated_user = _fetch_user_row(db, username)
        return _enrich_user_profile(db, updated_user, user["id"])


def update_user(
    username: str,
    user_data: UserPut,
    current_user: dict[str, Any],
    background_tasks: BackgroundTasks,
) -> dict:
    with PgDatabase() as db:
        db.cursor.execute(
            "SELECT id, email, username, is_verified FROM users WHERE username = %s",
            (username,),
        )
        user = db.cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user["id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=403, detail="You can only update your own profile"
            )

        is_verified = user["is_verified"]
        if user["email"] != user_data.email:
            is_verified = False
            _queue_email_verification_on_email_change(user_data.email, background_tasks)

        images = user_data.images
        interests = user_data.interests
        profile_picture = user_data.profile_picture

        profile_data = {
            "gender": user_data.gender,
            "sexual_preference": user_data.sexual_preference,
            "bio": user_data.bio,
            "latitude": user_data.latitude,
            "longitude": user_data.longitude,
        }

        if images is not None:
            _sync_images(db, user["id"], images, profile_picture)

        if interests is not None:
            _sync_interests(db, user["id"], interests)

        is_profile_completed = check_profile_completion(db, user["id"], profile_data)

        db.cursor.execute(
            f"""
            UPDATE users
            SET first_name = %s, last_name = %s, email = %s,
                bio = %s, gender = %s, sexual_preference = %s,
                latitude = %s, longitude = %s, location_label = %s,
                is_verified = %s, is_profile_completed = %s
            WHERE username = %s
            """,
            (
                user_data.first_name,
                user_data.last_name,
                user_data.email,
                user_data.bio,
                user_data.gender,
                user_data.sexual_preference,
                user_data.latitude,
                user_data.longitude,
                user_data.location_label,
                is_verified,
                is_profile_completed,
                username,
            ),
        )

        updated_user = _fetch_user_row(db, username)
        return _enrich_user_profile(db, updated_user, user["id"])


def delete_user(username: str, current_user: dict[str, Any]) -> None:
    with PgDatabase() as db:
        db.cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        user = db.cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user["id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=403, detail="You can only delete your own account"
            )

        db.cursor.execute(
            "DELETE FROM users WHERE username = %s RETURNING id", (username,)
        )

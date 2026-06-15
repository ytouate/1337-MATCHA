from typing import Any, Optional

from fastapi import BackgroundTasks, HTTPException, Response, status

from src.db.database import PgDatabase
from src.schemas.user import Gender, UserPut, UserUpdate
from src.services import email_service


def check_profile_completion(user_data: dict) -> bool:
    required_fields = ["gender", "sexual_preference", "bio", "latitude", "longitude"]
    return all(
        user_data.get(field) is not None and user_data.get(field) != ""
        for field in required_fields
    )


def _sync_images(
    db,
    user_id: int,
    images: list[str],
    profile_picture: Optional[str],
) -> None:
    db.cursor.execute("DELETE FROM images WHERE user_id = %s", (user_id,))

    image_insert_query = """
    INSERT INTO images (user_id, url, is_profile_picture)
    VALUES (%s, %s, %s)
    """
    for i, image_url in enumerate(images):
        is_profile = (image_url == profile_picture) if profile_picture else (i == 0)
        db.cursor.execute(image_insert_query, (user_id, image_url, is_profile))


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


def get_user_by_username(username: str) -> dict:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT id, email, username, first_name, last_name, gender,
                   bio, sexual_preference, latitude, longitude, is_verified,
                   is_profile_completed
            FROM users WHERE username = %s
            """,
            (username,),
        )
        user = db.cursor.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def partial_update_user(
    username: str,
    user_data: UserUpdate,
    current_user: dict[str, Any],
    background_tasks: BackgroundTasks,
) -> dict | Response:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT id, gender, bio, sexual_preference, latitude, longitude
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
        update_fields.pop("sexual_preference", None)

        images = update_fields.pop("images", None)
        interests = update_fields.pop("interests", None)
        profile_picture = update_fields.pop("profile_picture", None)

        if not update_fields and not images and not interests:
            return Response(
                status_code=status.HTTP_304_NOT_MODIFIED, content="No fields to update"
            )

        if "email" in update_fields:
            update_fields["is_verified"] = False
            _queue_email_verification_on_email_change(
                update_fields["email"], background_tasks
            )

        if "gender" in update_fields:
            update_fields["sexual_preference"] = (
                Gender.FEMALE if update_fields["gender"] == Gender.MALE else Gender.MALE
            )
        elif not user["sexual_preference"]:
            update_fields["sexual_preference"] = (
                Gender.FEMALE if user["gender"] == Gender.MALE else Gender.MALE
            )

        updated_values = dict(user)
        updated_values.update(update_fields)
        update_fields["is_profile_completed"] = check_profile_completion(updated_values)

        updated_user = None
        if update_fields:
            set_clause = ", ".join(f"{k} = %s" for k in update_fields.keys())
            values = list(update_fields.values())
            values.append(username)

            db.cursor.execute(
                f"""
                UPDATE users
                SET {set_clause}
                WHERE username = %s
                RETURNING id, email, username, first_name, last_name, gender,
                       bio, sexual_preference, latitude, longitude, is_verified,
                       is_profile_completed
                """,
                values,
            )
            updated_user = db.cursor.fetchone()

        if images:
            _sync_images(db, current_user["user_id"], images, profile_picture)

        if interests:
            _sync_interests(db, current_user["user_id"], interests)

        return updated_user


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

        original_username = user["username"]

        sexual_preference = (
            Gender.FEMALE if user_data.gender == Gender.MALE else Gender.MALE
        )

        is_verified = user["is_verified"]
        if user["email"] != user_data.email:
            is_verified = False
            _queue_email_verification_on_email_change(user_data.email, background_tasks)

        images = getattr(user_data, "images", None)
        interests = getattr(user_data, "interests", None)
        profile_picture = getattr(user_data, "profile_picture", None)

        profile_data = {
            "gender": user_data.gender,
            "sexual_preference": sexual_preference,
            "bio": user_data.bio,
            "latitude": user_data.latitude,
            "longitude": user_data.longitude,
        }
        is_profile_completed = check_profile_completion(profile_data)

        db.cursor.execute(
            """
            UPDATE users
            SET first_name = %s, last_name = %s, email = %s,
                bio = %s, gender = %s, sexual_preference = %s, latitude = %s,
                longitude = %s, is_verified = %s, is_profile_completed = %s
            WHERE username = %s
            RETURNING id, email, username, first_name, last_name, gender,
                   bio, sexual_preference, latitude, longitude, is_verified,
                   is_profile_completed
            """,
            (
                user_data.first_name,
                user_data.last_name,
                user_data.email,
                user_data.bio,
                user_data.gender,
                sexual_preference,
                original_username,
                user_data.latitude,
                user_data.longitude,
                is_verified,
                is_profile_completed,
                username,
            ),
        )
        updated_user = db.cursor.fetchone()

        if images:
            _sync_images(db, current_user["user_id"], images, profile_picture)

        if interests:
            _sync_interests(db, current_user["user_id"], interests)

        return updated_user


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

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Response, status
from ..database.database import PgDatabase
from ..helpers.auth import get_current_user
from ..helpers.schemas import UserUpdate, UserPut, Gender
from ..helpers.utils import generate_jwt_token, send_email
from datetime import timedelta
import os

router = APIRouter(
    prefix="/api/users",
    tags=["User Management"],
    responses={
        401: {"description": "Unauthorized - Authentication required"},
        403: {"description": "Forbidden - Insufficient permissions"},
        404: {"description": "User not found"},
        422: {"description": "Validation error"},
    },
)


def check_profile_completion(user_data: dict) -> bool:
    """Check if all required profile fields are filled."""
    required_fields = ["gender", "sexual_preference", "bio", "latitude", "longitude"]
    return all(
        user_data.get(field) is not None and user_data.get(field) != ""
        for field in required_fields
    )


@router.get(
    "/{username}",
    summary="Get User Profile",
    description="Retrieve public profile information for a specific user",
    response_description="User profile details",
)
async def get_user(username: str, current_user=Depends(get_current_user)):
    """
    Retrieve user profile:
    - Fetch user details from database
    - Return public profile information
    """
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


@router.patch(
    "/{username}",
    summary="Update User Profile",
    description="Update profile information for the authenticated user",
    response_description="Updated user profile",
)
async def partial_update_user(
    username: str,
    user_data: UserUpdate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    """
    Update user profile:
    - Validate user authentication
    - Update user profile in database
    - Return updated profile
    """
    with PgDatabase() as db:
        # First get the user to check permissions and current data
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

        update_fields = {k: v for k, v in user_data.dict().items() if v is not None}

        # Remove any attempts to update username or sexual_preference
        update_fields.pop("username", None)
        update_fields.pop("sexual_preference", None)

        if not update_fields:
            return Response(
                status_code=status.HTTP_304_NOT_MODIFIED, content="No fields to update"
            )

        # If email is being updated, set is_verified to false
        if "email" in update_fields:
            update_fields["is_verified"] = False
            # Generate verification token and send email
            token = generate_jwt_token(
                type="email_verification",
                data={"email": update_fields["email"]},
                expires_delta=timedelta(hours=24),
            )
            background_tasks.add_task(
                send_email,
                subject="Matcha Email Confirmation",
                email_to=update_fields["email"],
                link=f"{os.getenv('EMAIL_VERIFICATION_REDIRECT_URL')}?token={token}",
            )

        # If gender is being updated, update sexual_preference accordingly
        if "gender" in update_fields:
            update_fields["sexual_preference"] = (
                Gender.FEMALE if update_fields["gender"] == Gender.MALE else Gender.MALE
            )

        # Create a dict with current values updated with new values
        updated_values = dict(user)
        updated_values.update(update_fields)

        # Check if profile is complete after updates
        update_fields["is_profile_completed"] = check_profile_completion(updated_values)

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

        return updated_user


@router.put(
    "/{username}",
    summary="Replace User Profile",
    description="Replace profile information for the authenticated user",
    response_description="Updated user profile",
)
async def update_user(
    username: str,
    user_data: UserPut,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    """
    Update user profile:
    - Validate user authentication
    - Update user profile in database
    - Return updated profile
    """
    with PgDatabase() as db:
        # First get the user to check permissions
        db.cursor.execute(
            "SELECT id, email, username FROM users WHERE username = %s", (username,)
        )
        user = db.cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user["id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=403, detail="You can only update your own profile"
            )

        # Keep original username
        original_username = user["username"]

        # Set sexual_preference based on gender
        sexual_preference = (
            Gender.FEMALE if user_data.gender == Gender.MALE else Gender.MALE
        )

        # If email is being updated, handle verification
        is_verified = user_data.is_verified
        if user["email"] != user_data.email:
            is_verified = False
            # Generate verification token and send email
            token = generate_jwt_token(
                type="email_verification",
                data={"email": user_data.email},
                expires_delta=timedelta(hours=24),
            )
            background_tasks.add_task(
                send_email,
                subject="Matcha Email Confirmation",
                email_to=user_data.email,
                link=f"{os.getenv('EMAIL_VERIFICATION_REDIRECT_URL')}?token={token}",
            )

        # Check if profile will be complete after update
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

        return updated_user


@router.delete(
    "/{username}",
    summary="Delete User Profile",
    description="Delete the authenticated user's profile",
    response_description="User profile deleted",
)
async def delete_user(username: str, current_user=Depends(get_current_user)):
    """
    Delete user profile:
    - Validate user authentication
    - Delete user profile from database
    - Return success response
    """
    with PgDatabase() as db:
        # First get the user to check permissions
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

        return Response(status_code=status.HTTP_204_NO_CONTENT)

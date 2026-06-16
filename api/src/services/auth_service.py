from datetime import timedelta
from typing import Any

import jose
from fastapi import BackgroundTasks, HTTPException, Response, status

from src.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    COOKIE_DOMAIN,
    COOKIE_HTTPONLY,
    COOKIE_PATH,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    FRONT_BASE_URL,
    JWT_ALGORITHM,
    JWT_SECRET_KEY,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from src.core.security import generate_jwt_token, hash_password, verify_password
from src.db.database import PgDatabase
from src.db.helper import DatabaseHelper
from src.schemas.auth import (
    PasswordResetConfirm,
    PasswordResetRequest,
    SignInData,
    SignupData,
)
from src.services import email_service


def signup(payload: SignupData, background_tasks: BackgroundTasks) -> dict:
    with PgDatabase() as db:
        db.cursor.execute(
            "SELECT is_verified FROM users WHERE email = %s",
            (payload.email,),
        )
        existing_by_email = db.cursor.fetchone()

        if existing_by_email:
            if not existing_by_email["is_verified"]:
                email_service.queue_verification_email(payload.email, background_tasks)
                return {"message": "Verification email sent. Please check your inbox."}
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )

        db.cursor.execute(
            "SELECT is_verified FROM users WHERE username = %s",
            (payload.username,),
        )
        existing_by_username = db.cursor.fetchone()

        if existing_by_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

    data = payload.model_dump()
    data["password"] = hash_password(data["password"])
    data["gender"] = data["gender"].value
    DatabaseHelper.create_row("users", data)

    email_service.queue_verification_email(data["email"], background_tasks)

    return {"message": "User successfully registered"}


def signin(payload: SignInData) -> tuple[dict, dict[str, str]]:
    with PgDatabase() as db:
        db.cursor.execute(
            "SELECT * FROM users WHERE email=%(login)s or username=%(login)s",
            {"login": payload.login},
        )
        user = db.cursor.fetchone()

    if not user or not user.get("password") or not verify_password(
        payload.password, user["password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user["is_verified"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not verified",
        )

    access_token = generate_jwt_token(
        type="access_token",
        data={"user_id": user["id"], "email": user["email"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    refresh_token = generate_jwt_token(
        type="refresh_token",
        data={"user_id": user["id"], "email": user["email"]},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return user, {"access_token": access_token, "refresh_token": refresh_token}


def set_auth_cookies(response: Response, tokens: dict[str, str]) -> None:
    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


def verify_email(token: str) -> str:
    try:
        token_decoded = jose.jwt.decode(
            token=token, key=JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        if token_decoded.get("type") != "email_verification":
            raise HTTPException(status_code=400, detail="Invalid token type")
        email = token_decoded.get("data").get("email")
        if not DatabaseHelper.update_database_value(
            table_name="users",
            condition_field="email",
            condition_value=email,
            new_value=True,
            field_to_update="is_verified",
        ):
            raise HTTPException(status_code=400, detail="Email invalid")
        return f"{FRONT_BASE_URL}?verified=1"
    except jose.jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token has expired!")
    except jose.JWTError:
        raise HTTPException(status_code=400, detail="Invalid Token")


def forgot_password(
    payload: PasswordResetRequest, background_tasks: BackgroundTasks
) -> dict:
    email = payload.email
    if not DatabaseHelper.field_exists("users", "email", email):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Email not found"
        )

    email_service.queue_password_reset_email(email, background_tasks)
    return {"message": "Password reset link sent"}


def validate_reset_token(token: str) -> dict:
    try:
        decoded_token = jose.jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        if decoded_token.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token type")

        email = decoded_token.get("data").get("email")
        if not email or not DatabaseHelper.field_exists("users", "email", email):
            raise HTTPException(status_code=404, detail="User not found")

        return {"message": "Token is valid"}
    except jose.JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")


def reset_password(token: str, payload: PasswordResetConfirm) -> dict:
    try:
        decoded_token = jose.jwt.decode(
            token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )

        if decoded_token.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type"
            )

        email = decoded_token.get("data", {}).get("email")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
            )

        hashed_password = hash_password(payload.new_password)

        with PgDatabase() as db:
            db.cursor.execute(
                "UPDATE users SET password = %s WHERE email = %s",
                (hashed_password, email),
            )
            db.connection.commit()

        return {"message": "Password reset successfully"}

    except jose.jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token has expired"
        )
    except jose.jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
        )


def get_current_user_profile(user_data: dict[str, Any]) -> dict:
    from src.services import user_service
    from src.services.presence_service import touch_last_seen
    from src.db.database import PgDatabase

    with PgDatabase() as db:
        touch_last_seen(db, user_data["user_id"])

    return user_service.get_user_profile_by_id(user_data["user_id"])


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key="access_token",
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
    )

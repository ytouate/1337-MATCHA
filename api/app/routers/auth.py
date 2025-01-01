from fastapi import (
    APIRouter,
    BackgroundTasks,
    HTTPException,
    Query,
    Response,
    Request,
    status,
)
from fastapi.responses import JSONResponse, RedirectResponse
from passlib.context import CryptContext
import os
import jose
from datetime import timedelta

from ..database.database import PgDatabase
from ..helpers.schemas import (
    SignInData,
    SignupData,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from ..helpers.utils import DatabaseHelper, generate_jwt_token, send_email
from ..helpers.auth import get_current_user

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
    responses={
        401: {"description": "Unauthorized - Invalid credentials"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"},
    },
)

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


@router.post("/signup")
async def signup(payload: SignupData, background_tasks: BackgroundTasks):
    """
    Register a new user:
    - Validate user data
    - Check if username or email already exists
    - Create user account
    - Send verification email
    """
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    if DatabaseHelper.field_exists(
        "users", "email", payload.email
    ) or DatabaseHelper.field_exists("users", "username", payload.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or Username already exists",
        )

    data = dict(payload)
    data["password"] = pwd_context.hash(data["password"])
    data["gender"] = data["gender"].value
    DatabaseHelper.create_row("users", data)

    token = generate_jwt_token(
        type="email_verification",
        data={"email": data["email"]},
        expires_delta=timedelta(hours=24),
    )

    background_tasks.add_task(
        send_email,
        subject="Matcha Email Confirmation",
        email_to=data["email"],
        link=f"{os.getenv('EMAIL_VERIFICATION_REDIRECT_URL')}?token={token}",
    )

    return {"message": "User successfully registered"}


@router.post("/signin")
async def signin(payload: SignInData, response: Response):
    """
    Authenticate user:
    - Validate credentials
    - Generate JWT tokens
    - Return tokens for authentication
    """
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    with PgDatabase() as db:
        db.cursor.execute(
            "SELECT * FROM users WHERE email=%(login)s or username=%(login)s",
            {"login": payload.login},
        )
        user = db.cursor.fetchone()

    if not user or not pwd_context.verify(payload.password, user["password"]):
        return JSONResponse(content={"error": "Invalid credentials"}, status_code=401)

    if not user["is_verified"]:
        return JSONResponse(content={"error": "Email not verified"}, status_code=401)

    # Generate access token
    access_token = generate_jwt_token(
        type="access_token",
        data={"user_id": user["id"], "email": user["email"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # Generate refresh token
    refresh_token = generate_jwt_token(
        type="refresh_token",
        data={"user_id": user["id"], "email": user["email"]},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        domain="localhost",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        domain="localhost",
        path="/",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
        }
    }


@router.get("/email-verification")
def email_verification(token: str = Query(...)):
    """
    Verify user email:
    - Validate verification token
    - Mark email as verified
    - Activate user account
    """
    try:
        token_decoded = jose.jwt.decode(
            token=token, key=os.getenv("JWT_SECRET_KEY"), algorithms=["HS256"]
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
        return RedirectResponse(url=os.getenv("FRONT_BASE_URL"), status_code=301)
    except jose.jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token has expired!")
    except jose.JWTError:
        raise HTTPException(status_code=400, details="Invalid Token")


@router.post("/forgot-password")
async def forgot_password(
    payload: PasswordResetRequest, background_tasks: BackgroundTasks
):
    """
    Initiate password reset process:
    - Verify email exists
    - Generate reset token
    - Send reset link via email
    """
    email = payload.email
    if not DatabaseHelper.field_exists("users", "email", email):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Email not found"
        )

    reset_token = generate_jwt_token(
        type="password_reset", data={"email": email}, expires_delta=timedelta(hours=1)
    )

    background_tasks.add_task(
        send_email,
        subject="Password Reset",
        email_to=email,
        link=f"{os.getenv('FRONT_BASE_URL')}/reset-password/form?token={reset_token}",
    )

    return {"message": "Password reset link sent"}


@router.get("/validate-reset-token/{token}")
async def validate_reset_token(token: str):
    """
    Validate password reset token:
    - Check token validity
    - Return success if token is valid
    """
    try:
        decoded_token = jose.jwt.decode(
            token,
            os.getenv("JWT_SECRET_KEY"),
            algorithms=["HS256"],
        )
        if decoded_token.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token type")

        email = decoded_token.get("data").get("email")
        if not email or not DatabaseHelper.field_exists("users", "email", email):
            raise HTTPException(status_code=404, detail="User not found")

        return JSONResponse(status_code=200, content={"message": "Token is valid"})
    except jose.JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")


@router.post("/reset-password/{token}")
async def reset_password(token: str, payload: PasswordResetConfirm):
    """
    Complete password reset:
    - Validate reset token
    - Update user password
    - Invalidate reset token
    """
    try:
        decoded_token = jose.jwt.decode(
            token, os.getenv("JWT_SECRET_KEY"), algorithms=["HS256"]
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

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash(payload.new_password)

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


@router.get("/me")
async def get_me(request: Request):
    """
    Get current user:
    - Retrieve user data from database
    - Return user data
    """
    user_data = get_current_user(request)

    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT 
                id, email, username, first_name, last_name, gender,
                CASE 
                    WHEN bio IS NOT NULL 
                    AND sexual_preference IS NOT NULL 
                    AND latitude IS NOT NULL 
                    AND longitude IS NOT NULL 
                    THEN true 
                    ELSE false 
                END as is_profile_completed
            FROM users
            WHERE id = %s
            """,
            (user_data["user_id"],),
        )
        user = db.cursor.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.post("/signout")
async def signout(response: Response):
    """
    Sign out:
    - Delete access and refresh tokens
    - Return success
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="lax",
        domain="localhost",
        path="/",
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=True,
        samesite="lax",
        domain="localhost",
        path="/",
    )
    return {"message": "Successfully signed out"}

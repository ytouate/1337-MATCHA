import os
from datetime import timedelta

import jose
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Response
from fastapi.responses import JSONResponse, RedirectResponse
from passlib.context import CryptContext

from ..database.database import PgDatabase
from ..helpers.schemas import SignInData, SignupData
from ..helpers.utils import DatabaseHelper, generate_jwt_token, send_email

router = APIRouter(prefix="/auth")

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


@router.post("/signup")
async def signup(payload: SignupData, background_tasks: BackgroundTasks):
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    if DatabaseHelper.field_exists(
        "users", "email", payload.email
    ) or DatabaseHelper.field_exists("users", "username", payload.username):
        return JSONResponse(
            status_code=400,
            content={
                "error": "Bad Request",
                "message": "Email or Username already exists.",
            },
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
    return JSONResponse(
        status_code=201, content={"message": "User successfully registered."}
    )


@router.get("/email-verification")
def email_verification(token: str = Query(...)):
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


@router.post("/signin")
async def signin(payload: SignInData, response: Response):
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


@router.post("/signout")
async def signout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Successfully signed out"}

from ..helpers.utils import create_row
from ..helpers.schemas import SignupData
from ..helpers.utils import check_field_exist, update_database_value
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from ..helpers.utils import send_email, generate_jwt_token
from passlib.context import CryptContext
import jose
import os

router = APIRouter(prefix="/auth")


@router.post("/signup")
async def signup(payload: SignupData, background_tasks: BackgroundTasks):
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    if check_field_exist("users", "email", payload.email) or check_field_exist(
        "users", "username", payload.username
    ):
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
    create_row("users", data)
    token = generate_jwt_token(
        type="email_verification",
        data=data["email"],
    )
    background_tasks.add_task(
        send_email,
        subject="Matcha Email Confirmation",
        email_to=data["email"],
        link=f"http://localhost:9000/auth/email-verification?token={token}",
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
        email = token_decoded.get("data")
        if not update_database_value(
            table_name="users",
            condition_field="email",
            condition_value=email,
            new_value=True,
            field_to_update="is_verified",
        ):
            raise HTTPException(status_code=400, detail="Email invalid")

        return RedirectResponse(url=os.getenv("FRONT_URL_BASE"), status_code=301)
    except jose.jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token has expired!")
    except jose.JWTError:
        raise HTTPException(status_code=400, details="Invalid Token")

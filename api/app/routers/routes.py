from ..helpers.utils import create_row
from ..helpers.schemas import SignupData
from ..helpers.utils import check_field_exist
from fastapi.responses import JSONResponse
from fastapi import APIRouter
from ..helpers.utils import send_email_async
from passlib.context import CryptContext

router = APIRouter()


@router.post("/signup")
async def signup(payload: SignupData):
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    if not (
        check_field_exist("users", "email", payload.email)
        or check_field_exist("users", "username", payload.username)
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
    await send_email_async(subject="Test", email_to="tehsusrhsit@gmail.com")
    return JSONResponse(
        status_code=201, content={"message": "User successfully registered."}
    )

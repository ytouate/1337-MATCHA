from fastapi import FastAPI
import dotenv
from pathlib import Path
from .database.queries.create_tables import create_table
from .database.queries.create_row import create_row
import json
from .helpers.schemas import SignupData
from .helpers.db import check_exist
from fastapi.responses import JSONResponse
from passlib.context import CryptContext

BASE_DIR = Path(__file__).resolve().parent.parent

dotenv.load_dotenv(BASE_DIR / ".env")


def get_table_data():
    with open("./app/database/models/user.json") as file:
        table_data = json.load(file)
    create_table("users", table_data)


# get_table_data()


app = FastAPI()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@app.post("/signup")
async def signup(payload: SignupData):
    if not (
        check_exist("users", "email", payload.email)
        or check_exist("users", "username", payload.username)
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
    return JSONResponse(
        status_code=201, content={"message": "User successfully registered."}
    )

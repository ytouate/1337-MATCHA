from fastapi import FastAPI
import dotenv
from pathlib import Path
from .routers.routes import router
from os import environ

# from .helpers.send_mail import send_email_async

BASE_DIR = Path(__file__).resolve().parent.parent

dotenv.load_dotenv(BASE_DIR / ".env")


# data = get_table_data(table_name="users", file_path="./app/database/models/user.json")

app = FastAPI()

app.include_router(router)

print("=======================================")
print(
    environ.get("MAIL_USERNAME"),
    environ.get("MAIL_PASSWORD"),
    environ.get("MAIL_FROM"),
    environ.get("MAIL_PORT"),
    environ.get("MAIL_SERVER"),
    environ.get("MAIL_FROM_NAME"),
)
print("=======================================")

# send_email_async(subject="hello", email_to="tehsusrhist@gmail.com")

import os
from datetime import timedelta

import dotenv
from fastapi import BackgroundTasks
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from jinja2 import Template

from src.core.config import EMAIL_VERIFICATION_REDIRECT_URL, FRONT_BASE_URL
from src.core.security import generate_jwt_token

dotenv.load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("EMAIL_HOST_USER"),
    MAIL_PASSWORD=os.getenv("EMAIL_HOST_PASSWORD"),
    MAIL_FROM=os.getenv("EMAIL_HOST_USER"),
    MAIL_PORT=os.getenv("EMAIL_PORT"),
    MAIL_SERVER=os.getenv("EMAIL_HOST"),
    MAIL_SSL_TLS=False,
    MAIL_STARTTLS=True,
)


def render_template(file_name: str, link: str) -> str:
    file_path = os.path.join(
        os.path.dirname(__file__), "..", "core", "templates", file_name
    )
    with open(file_path) as file:
        file_content = file.read()
    template_email = Template(file_content)
    return template_email.render(link=link)


async def send_email(
    subject: str,
    email_to: str,
    link: str,
    template_name: str = "email_confirmation.html",
):
    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        body=render_template(file_name=template_name, link=link),
        subtype=MessageType.html,
    )
    fm = FastMail(conf)
    await fm.send_message(message)


def queue_verification_email(email: str, background_tasks: BackgroundTasks) -> None:
    token = generate_jwt_token(
        type="email_verification",
        data={"email": email},
        expires_delta=timedelta(hours=24),
    )
    background_tasks.add_task(
        send_email,
        subject="Matcha Email Confirmation",
        email_to=email,
        link=f"{EMAIL_VERIFICATION_REDIRECT_URL}?token={token}",
    )


def queue_password_reset_email(email: str, background_tasks: BackgroundTasks) -> None:
    reset_token = generate_jwt_token(
        type="password_reset",
        data={"email": email},
        expires_delta=timedelta(hours=1),
    )
    background_tasks.add_task(
        send_email,
        subject="Password Reset",
        email_to=email,
        link=f"{FRONT_BASE_URL}/reset-password/form?token={reset_token}",
    )

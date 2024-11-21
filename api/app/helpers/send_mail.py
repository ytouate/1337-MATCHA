from os import environ
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

conf = ConnectionConfig(
    MAIL_USERNAME="matcha",
    MAIL_PASSWORD="dfhu fgjd mkip vfri",
    MAIL_FROM="tehsusrhist@gmail.com",
    MAIL_PORT=465,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_FROM_NAME="matcha",
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


async def send_email_async(subject: str, email_to: str):
    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        body="<h1>hello</h1>",
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)

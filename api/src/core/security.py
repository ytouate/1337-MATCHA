import datetime
from datetime import timedelta

import bcrypt
from jose import jwt

from src.core.config import JWT_ALGORITHM, JWT_SECRET_KEY


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def generate_jwt_token(
    type: str, data: dict, expires_delta: timedelta, algorithm: str = JWT_ALGORITHM
) -> str:
    claims = {
        "data": data,
        "type": type,
        "exp": datetime.datetime.now() + expires_delta,
        "iat": datetime.datetime.now(),
    }
    return jwt.encode(claims=claims, key=JWT_SECRET_KEY, algorithm=algorithm)

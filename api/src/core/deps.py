from fastapi import HTTPException, Request
from jose import JWTError, jwt
from typing import Optional

from src.core.config import JWT_ALGORITHM, JWT_SECRET_KEY


def _decode_token(request: Request) -> Optional[dict]:
    access_token = request.cookies.get("access_token")
    if not access_token:
        return None

    try:
        payload = jwt.decode(
            token=access_token, key=JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        if payload.get("type") != "access_token":
            return None

        user_data = payload.get("data")
        if not user_data:
            return None

        return user_data
    except JWTError:
        return None


def get_current_user(request: Request):
    user_data = _decode_token(request)
    if not user_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_data


def get_optional_user(request: Request) -> Optional[dict]:
    return _decode_token(request)

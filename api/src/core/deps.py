from fastapi import HTTPException, Request
from jose import JWTError, jwt

from src.core.config import JWT_ALGORITHM, JWT_SECRET_KEY


def get_current_user(request: Request):
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            token=access_token, key=JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        if payload.get("type") != "access_token":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_data = payload.get("data")
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid token data")

        return user_data
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

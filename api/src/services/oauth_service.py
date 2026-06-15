import secrets
from datetime import timedelta
from typing import Any
from urllib.parse import quote, urlencode

import httpx
from fastapi import HTTPException, status

from src.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    FORTY_TWO_CLIENT_ID,
    FORTY_TWO_CLIENT_SECRET,
    FORTY_TWO_REDIRECT_URI,
    FRONT_BASE_URL,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from src.core.security import generate_jwt_token
from src.db.database import PgDatabase

FORTY_TWO_AUTHORIZE_URL = "https://api.intra.42.fr/oauth/authorize"
FORTY_TWO_TOKEN_URL = "https://api.intra.42.fr/oauth/token"
FORTY_TWO_ME_URL = "https://api.intra.42.fr/v2/me"
OAUTH_PROVIDER_42 = "42"
OAUTH_STATE_COOKIE = "oauth_state"
OAUTH_STATE_MAX_AGE = 600


class OAuthError(Exception):
    pass


def is_configured() -> bool:
    return bool(
        FORTY_TWO_CLIENT_ID and FORTY_TWO_CLIENT_SECRET and FORTY_TWO_REDIRECT_URI
    )


def require_configured() -> None:
    if not is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="42 OAuth is not configured",
        )


def build_error_redirect(message: str) -> str:
    return f"{FRONT_BASE_URL}?oauth_error={quote(message)}"


def start_42_oauth() -> tuple[str, str]:
    require_configured()
    state = secrets.token_urlsafe(32)
    params = urlencode(
        {
            "client_id": FORTY_TWO_CLIENT_ID,
            "redirect_uri": FORTY_TWO_REDIRECT_URI,
            "response_type": "code",
            "scope": "public",
            "state": state,
        }
    )
    return f"{FORTY_TWO_AUTHORIZE_URL}?{params}", state


def _issue_tokens(user: dict[str, Any]) -> dict[str, str]:
    access_token = generate_jwt_token(
        type="access_token",
        data={"user_id": user["id"], "email": user["email"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = generate_jwt_token(
        type="refresh_token",
        data={"user_id": user["id"], "email": user["email"]},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    return {"access_token": access_token, "refresh_token": refresh_token}


def _exchange_code_for_profile(code: str) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        token_response = client.post(
            FORTY_TWO_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "client_id": FORTY_TWO_CLIENT_ID,
                "client_secret": FORTY_TWO_CLIENT_SECRET,
                "code": code,
                "redirect_uri": FORTY_TWO_REDIRECT_URI,
            },
        )
        if token_response.status_code != 200:
            raise OAuthError("Failed to exchange authorization code")

        access_token = token_response.json().get("access_token")
        if not access_token:
            raise OAuthError("Missing access token from 42")

        profile_response = client.get(
            FORTY_TWO_ME_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_response.status_code != 200:
            raise OAuthError("Failed to fetch 42 profile")

        return profile_response.json()


def _parse_42_profile(profile: dict[str, Any]) -> dict[str, str]:
    provider_user_id = str(profile.get("id", "")).strip()
    login = str(profile.get("login", "")).strip()
    email = str(profile.get("email", "")).strip()
    first_name = str(profile.get("first_name", "")).strip() or login
    last_name = str(profile.get("last_name", "")).strip() or "42"

    if not provider_user_id or not login or not email:
        raise OAuthError("Incomplete profile returned by 42")

    return {
        "provider_user_id": provider_user_id,
        "login": login,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
    }


def _unique_username(db, base: str) -> str:
    username = base
    suffix = 0

    while True:
        db.cursor.execute(
            "SELECT 1 FROM users WHERE username = %s LIMIT 1",
            (username,),
        )
        if not db.cursor.fetchone():
            return username

        suffix += 1
        username = f"{base}-42" if suffix == 1 else f"{base}-42-{suffix}"


def _link_oauth_identity(db, user_id: int, provider_user_id: str) -> None:
    db.cursor.execute(
        """
        INSERT INTO oauth_identities (user_id, provider, provider_user_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (provider, provider_user_id) DO NOTHING
        """,
        (user_id, OAUTH_PROVIDER_42, provider_user_id),
    )


def _resolve_user(db, profile_data: dict[str, str]) -> dict[str, Any]:
    db.cursor.execute(
        """
        SELECT u.*
        FROM oauth_identities oi
        JOIN users u ON u.id = oi.user_id
        WHERE oi.provider = %s AND oi.provider_user_id = %s
        LIMIT 1
        """,
        (OAUTH_PROVIDER_42, profile_data["provider_user_id"]),
    )
    existing_oauth_user = db.cursor.fetchone()
    if existing_oauth_user:
        return existing_oauth_user

    db.cursor.execute(
        "SELECT * FROM users WHERE email = %s LIMIT 1",
        (profile_data["email"],),
    )
    existing_email_user = db.cursor.fetchone()
    if existing_email_user:
        if not existing_email_user["is_verified"]:
            raise OAuthError(
                "An account with this email exists but is not verified. "
                "Please verify your email or sign in with your password."
            )
        _link_oauth_identity(
            db, existing_email_user["id"], profile_data["provider_user_id"]
        )
        return existing_email_user

    username = _unique_username(db, profile_data["login"])
    db.cursor.execute(
        """
        INSERT INTO users (
            username, email, password, first_name, last_name, is_verified
        )
        VALUES (%s, %s, NULL, %s, %s, TRUE)
        RETURNING *
        """,
        (
            username,
            profile_data["email"],
            profile_data["first_name"],
            profile_data["last_name"],
        ),
    )
    user = db.cursor.fetchone()
    _link_oauth_identity(db, user["id"], profile_data["provider_user_id"])
    return user


def complete_42_oauth(
    code: str | None, state: str | None, stored_state: str | None
) -> tuple[dict[str, Any], dict[str, str]]:
    require_configured()

    if not code:
        raise OAuthError("Missing authorization code")
    if not state or not stored_state or state != stored_state:
        raise OAuthError("Invalid OAuth state")

    profile = _exchange_code_for_profile(code)
    profile_data = _parse_42_profile(profile)

    with PgDatabase() as db:
        user = _resolve_user(db, profile_data)

    return user, _issue_tokens(user)

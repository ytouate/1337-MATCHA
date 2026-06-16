from fastapi import APIRouter, BackgroundTasks, Query, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse

from src.core.config import (
    COOKIE_DOMAIN,
    COOKIE_HTTPONLY,
    COOKIE_PATH,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    FRONT_BASE_URL,
)
from src.core.deps import get_current_user
from src.schemas.auth import (
    PasswordResetConfirm,
    PasswordResetRequest,
    SignInData,
    SignupData,
)
from src.services import auth_service, oauth_service

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
    responses={
        401: {"description": "Unauthorized - Invalid credentials"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"},
    },
)


@router.post("/signup")
async def signup(payload: SignupData, background_tasks: BackgroundTasks):
    return auth_service.signup(payload, background_tasks)


@router.post("/signin")
async def signin(payload: SignInData, response: Response):
    user, tokens = auth_service.signin(payload)
    auth_service.set_auth_cookies(response, tokens)
    return {"user": user}


@router.get("/email-verification")
def email_verification(token: str = Query(...)):
    redirect_url = auth_service.verify_email(token)
    return RedirectResponse(url=redirect_url, status_code=301)


@router.post("/forgot-password")
async def forgot_password(
    payload: PasswordResetRequest, background_tasks: BackgroundTasks
):
    return auth_service.forgot_password(payload, background_tasks)


@router.get("/validate-reset-token/{token}")
async def validate_reset_token(token: str):
    return auth_service.validate_reset_token(token)


@router.post("/reset-password/{token}")
async def reset_password(token: str, payload: PasswordResetConfirm):
    return auth_service.reset_password(token, payload)


@router.get("/me")
async def get_me(request: Request):
    user_data = get_current_user(request)
    return auth_service.get_current_user_profile(user_data)


@router.post("/signout")
async def signout(response: Response):
    auth_service.clear_auth_cookies(response)
    return {"message": "Successfully signed out"}


@router.get("/oauth/42")
async def oauth_42_start():
    redirect_url, state = oauth_service.start_42_oauth()
    response = RedirectResponse(url=redirect_url, status_code=302)
    response.set_cookie(
        key=oauth_service.OAUTH_STATE_COOKIE,
        value=state,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
        max_age=oauth_service.OAUTH_STATE_MAX_AGE,
    )
    return response


@router.get("/oauth/42/callback")
async def oauth_42_callback(
    request: Request,
    code: str | None = Query(None),
    state: str | None = Query(None),
):
    stored_state = request.cookies.get(oauth_service.OAUTH_STATE_COOKIE)

    try:
        _, tokens = oauth_service.complete_42_oauth(code, state, stored_state)
    except oauth_service.OAuthError as exc:
        return RedirectResponse(
            url=oauth_service.build_error_redirect(str(exc)),
            status_code=302,
        )

    response = RedirectResponse(url=FRONT_BASE_URL, status_code=302)
    response.delete_cookie(
        key=oauth_service.OAUTH_STATE_COOKIE,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path=COOKIE_PATH,
    )
    auth_service.set_auth_cookies(response, tokens)
    return response

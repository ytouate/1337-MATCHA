from fastapi import APIRouter, Depends

from src.core.deps import get_current_user
from src.schemas.user import (
    BlockedUsersListResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ReportRequest,
)
from src.services import chat_service, moderation_service, social_service

router = APIRouter(
    prefix="/api",
    tags=["Social"],
)


@router.get("/users/me/connections")
async def get_my_connections(current_user=Depends(get_current_user)):
    return {"connections": social_service.get_connections(current_user["user_id"])}


@router.get("/users/me/blocked", response_model=BlockedUsersListResponse)
async def get_my_blocked_users(current_user=Depends(get_current_user)):
    return {
        "blocked": moderation_service.get_blocked_users(current_user["user_id"])
    }


@router.post("/users/{username}/block")
async def block_user(username: str, current_user=Depends(get_current_user)):
    return moderation_service.block_user(current_user["user_id"], username)


@router.delete("/users/{username}/block")
async def unblock_user(username: str, current_user=Depends(get_current_user)):
    return moderation_service.unblock_user(current_user["user_id"], username)


@router.post("/users/{username}/report")
async def report_user(
    username: str,
    payload: ReportRequest,
    current_user=Depends(get_current_user),
):
    return moderation_service.report_user(
        current_user["user_id"], username, payload.reason
    )


@router.get(
    "/chat/{username}/messages",
    response_model=list[ChatMessageResponse],
)
async def get_chat_messages(username: str, current_user=Depends(get_current_user)):
    return chat_service.get_messages(current_user["user_id"], username)


@router.post(
    "/chat/{username}/messages",
    response_model=ChatMessageResponse,
)
async def send_chat_message(
    username: str,
    payload: ChatMessageCreate,
    current_user=Depends(get_current_user),
):
    return chat_service.send_message(
        current_user["user_id"], username, payload.body
    )

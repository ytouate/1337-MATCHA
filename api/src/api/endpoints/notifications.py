from fastapi import APIRouter, Depends

from src.core.deps import get_current_user
from src.schemas.user import NotificationResponse
from src.services import notification_service

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(current_user=Depends(get_current_user)):
    return notification_service.list_notifications(current_user["user_id"])


@router.get("/unread-count")
async def get_unread_count(current_user=Depends(get_current_user)):
    return {
        "count": notification_service.unread_count(current_user["user_id"])
    }


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int, current_user=Depends(get_current_user)
):
    return notification_service.mark_read(
        current_user["user_id"], notification_id
    )


@router.post("/read-all")
async def mark_all_notifications_read(current_user=Depends(get_current_user)):
    return notification_service.mark_all_read(current_user["user_id"])

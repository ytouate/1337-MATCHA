from fastapi import APIRouter, BackgroundTasks, Depends, Response, status

from src.core.deps import get_current_user
from src.schemas.user import UserPut, UserUpdate
from src.services import user_service

router = APIRouter(
    prefix="/api/users",
    tags=["User Management"],
    responses={
        401: {"description": "Unauthorized - Authentication required"},
        403: {"description": "Forbidden - Insufficient permissions"},
        404: {"description": "User not found"},
        422: {"description": "Validation error"},
    },
)


@router.get(
    "/{username}",
    summary="Get User Profile",
    description="Retrieve public profile information for a specific user",
    response_description="User profile details",
)
async def get_user(username: str, current_user=Depends(get_current_user)):
    return user_service.get_user_by_username(username)


@router.patch(
    "/{username}",
    summary="Update User Profile",
    description="Update profile information for the authenticated user",
    response_description="Updated user profile",
)
async def partial_update_user(
    username: str,
    user_data: UserUpdate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    return user_service.partial_update_user(
        username, user_data, current_user, background_tasks
    )


@router.put(
    "/{username}",
    summary="Replace User Profile",
    description="Replace profile information for the authenticated user",
    response_description="Updated user profile",
)
async def update_user(
    username: str,
    user_data: UserPut,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    return user_service.update_user(
        username, user_data, current_user, background_tasks
    )


@router.delete(
    "/{username}",
    summary="Delete User Profile",
    description="Delete the authenticated user's profile",
    response_description="User profile deleted",
)
async def delete_user(username: str, current_user=Depends(get_current_user)):
    user_service.delete_user(username, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

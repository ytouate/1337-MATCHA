from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, status

from src.core.deps import get_current_user, get_optional_user
from src.schemas.suggestion import SuggestionListResponse, SuggestionQuery
from src.schemas.user import UserProfileResponse, UserPut, UserUpdate
from src.services import social_service, suggestion_service, user_service

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
    "/suggestions",
    summary="Advanced profile search",
    description=(
        "Search and browse profiles matching mutual preferences. "
        "Supports filtering by age, fame, distance, and interest tags, "
        "with sorting by age, location, fame, or shared interests."
    ),
    response_model=SuggestionListResponse,
)
async def get_suggestions(
    query: SuggestionQuery = Depends(),
    current_user=Depends(get_current_user),
):
    return suggestion_service.get_suggestions(current_user, query)


@router.get(
    "/me/viewers",
    summary="Get profile viewers",
    description="List users who viewed the authenticated user's profile",
)
async def get_my_viewers(current_user=Depends(get_current_user)):
    return social_service.get_profile_viewers(current_user["user_id"])


@router.get(
    "/me/likes",
    summary="Get users who liked me",
    description="List users who liked the authenticated user's profile",
)
async def get_my_likes(current_user=Depends(get_current_user)):
    return social_service.get_users_who_liked_me(current_user["user_id"])


@router.get(
    "/{username}",
    summary="Get User Profile",
    description="Retrieve public profile information for a specific user",
    response_model=UserProfileResponse,
)
async def get_user(
    username: str,
    request: Request,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    viewer_id = current_user["user_id"] if current_user else None
    return user_service.get_user_by_username(username, viewer_id=viewer_id)


@router.post(
    "/{username}/like",
    summary="Like a user",
)
async def like_user(username: str, current_user=Depends(get_current_user)):
    return social_service.like_user(current_user["user_id"], username)


@router.delete(
    "/{username}/like",
    summary="Unlike a user",
)
async def unlike_user(username: str, current_user=Depends(get_current_user)):
    return social_service.unlike_user(current_user["user_id"], username)


@router.patch(
    "/{username}",
    summary="Update User Profile",
    description="Update profile information for the authenticated user",
    response_model=UserProfileResponse,
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
    response_model=UserProfileResponse,
)
async def update_user(
    username: str,
    user_data: UserPut,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    return user_service.update_user(username, user_data, current_user, background_tasks)


@router.delete(
    "/{username}",
    summary="Delete User Profile",
    description="Delete the authenticated user's profile",
    response_description="User profile deleted",
)
async def delete_user(username: str, current_user=Depends(get_current_user)):
    user_service.delete_user(username, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

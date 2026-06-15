from typing import List

from fastapi import APIRouter, Depends, UploadFile, status

from src.core.deps import get_current_user
from src.services import storage_service

router = APIRouter(
    prefix="/api/upload",
    tags=["File Upload"],
    responses={
        400: {"description": "Invalid file upload"},
        401: {"description": "Unauthorized - Authentication required"},
        500: {"description": "Server error during file upload"},
    },
)


@router.post(
    "",
    summary="Upload Images",
    description="Upload up to 5 image files with validation",
    status_code=status.HTTP_201_CREATED,
    response_description="Uploaded image details with URLs",
)
async def upload_files(files: List[UploadFile], current_user=Depends(get_current_user)):
    return await storage_service.upload_files(files, current_user)

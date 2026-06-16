import io
import os
import uuid
from datetime import timedelta
from typing import List

from fastapi import HTTPException, UploadFile, status
from minio import Minio
from minio.error import S3Error
from PIL import Image

from src.core.config import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    MAX_IMAGE_DIMENSIONS,
    MAX_UPLOAD_FILES,
    MINIO_ACCESS_KEY,
    MINIO_BUCKET_NAME,
    MINIO_ENDPOINT,
    MINIO_SECRET_KEY,
    MINIO_SECURE,
)

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)


def validate_image(file: UploadFile) -> None:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    try:
        image = Image.open(io.BytesIO(file.file.read()))
        file.file.seek(0)

        if (
            image.width > MAX_IMAGE_DIMENSIONS[0]
            or image.height > MAX_IMAGE_DIMENSIONS[1]
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image too large. Maximum dimensions: {MAX_IMAGE_DIMENSIONS[0]}x{MAX_IMAGE_DIMENSIONS[1]}",
            )

        if image.format not in ["JPEG", "PNG", "GIF"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image format"
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file",
        )


async def upload_files(
    files: List[UploadFile], current_user: dict
) -> list[dict[str, str]]:
    if len(files) > MAX_UPLOAD_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum of {MAX_UPLOAD_FILES} files allowed",
        )

    try:
        uploaded_files = []
        for file in files:
            validate_image(file)

            ext = os.path.splitext(file.filename)[1].lower()
            unique_filename = f"{current_user['email']}/{uuid.uuid4()}{ext}"

            if not minio_client.bucket_exists(MINIO_BUCKET_NAME):
                minio_client.make_bucket(MINIO_BUCKET_NAME)

            file_data = await file.read()

            minio_client.put_object(
                bucket_name=MINIO_BUCKET_NAME,
                object_name=unique_filename,
                data=io.BytesIO(file_data),
                length=len(file_data),
                content_type=file.content_type,
            )

            url = minio_client.presigned_get_object(
                bucket_name=MINIO_BUCKET_NAME,
                object_name=unique_filename,
                expires=timedelta(days=7),
            )

            parsed_url = url.split("?")[0]
            short_url = parsed_url.split(MINIO_BUCKET_NAME + "/")[-1]

            uploaded_files.append({"url": short_url, "filename": unique_filename})

        return uploaded_files

    except S3Error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading file to storage",
        )
    finally:
        for file in files:
            await file.close()

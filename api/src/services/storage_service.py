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
    IMAGE_FORMAT_TO_MIME,
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


def _detect_image(file_data: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(file_data))
        image.load()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file",
        ) from exc

    if (
        image.width > MAX_IMAGE_DIMENSIONS[0]
        or image.height > MAX_IMAGE_DIMENSIONS[1]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Image too large. Maximum dimensions: "
                f"{MAX_IMAGE_DIMENSIONS[0]}x{MAX_IMAGE_DIMENSIONS[1]}"
            ),
        )

    if image.format not in IMAGE_FORMAT_TO_MIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format",
        )

    return image


def validate_image(file: UploadFile, file_data: bytes) -> Image.Image:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "File type not allowed. Allowed types: "
                f"{', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    return _detect_image(file_data)


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
            file_data = await file.read()
            image = validate_image(file, file_data)

            ext = os.path.splitext(file.filename or "")[1].lower()
            unique_filename = f"{current_user['email']}/{uuid.uuid4()}{ext}"

            if not minio_client.bucket_exists(MINIO_BUCKET_NAME):
                minio_client.make_bucket(MINIO_BUCKET_NAME)

            content_type = IMAGE_FORMAT_TO_MIME[image.format]

            minio_client.put_object(
                bucket_name=MINIO_BUCKET_NAME,
                object_name=unique_filename,
                data=io.BytesIO(file_data),
                length=len(file_data),
                content_type=content_type,
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

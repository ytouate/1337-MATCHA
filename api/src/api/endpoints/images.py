import io
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from minio.error import S3Error

from src.core.config import MINIO_BUCKET_NAME
from src.services.storage_service import minio_client

router = APIRouter(
    prefix="/api/images",
    tags=["Images"],
)


@router.get("/{path:path}")
async def get_image(path: str):
    object_name = unquote(path)
    try:
        response = minio_client.get_object(MINIO_BUCKET_NAME, object_name)
        data = response.read()
        response.close()
        response.release_conn()

        content_type = "image/jpeg"
        lower_path = object_name.lower()
        if lower_path.endswith(".png"):
            content_type = "image/png"
        elif lower_path.endswith(".gif"):
            content_type = "image/gif"

        return StreamingResponse(io.BytesIO(data), media_type=content_type)
    except S3Error:
        raise HTTPException(status_code=404, detail="Image not found")

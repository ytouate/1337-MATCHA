from fastapi import APIRouter, UploadFile, HTTPException, Depends, status
from minio import Minio
from minio.error import S3Error
import os
import uuid
from datetime import timedelta
from PIL import Image
import io

from ..helpers.auth import get_current_user

router = APIRouter(
    prefix="/api/upload", 
    tags=["File Upload"],
    responses={
        400: {"description": "Invalid file upload"},
        401: {"description": "Unauthorized - Authentication required"},
        500: {"description": "Server error during file upload"}
    }
)

# Initialize MinIO client
minio_client = Minio(
    os.getenv("MINIO_ENDPOINT", "storage:9001"),
    access_key=os.getenv("MINIO_ACCESS_KEY"),
    secret_key=os.getenv("MINIO_SECRET_KEY"),
    secure=False  # Set to True if using HTTPS
)

BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "matcha")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_IMAGE_DIMENSIONS = (2000, 2000)  # Max width and height

def validate_image(file: UploadFile) -> None:
    """
    Validate uploaded image:
    - Check file extension
    - Validate file size
    - Verify image dimensions
    """
    # Check file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE/1024/1024}MB"
        )

    # Validate image dimensions and format
    try:
        image = Image.open(io.BytesIO(file.file.read()))
        file.file.seek(0)  # Reset file pointer
        
        # Check image dimensions
        if (
            image.width > MAX_IMAGE_DIMENSIONS[0]
            or image.height > MAX_IMAGE_DIMENSIONS[1]
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image too large. Maximum dimensions: {MAX_IMAGE_DIMENSIONS[0]}x{MAX_IMAGE_DIMENSIONS[1]}"
            )
        
        # Validate image format
        if image.format not in ["JPEG", "PNG", "GIF"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Invalid image format"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid image file: {str(e)}"
        )

@router.post("", 
    summary="Upload Image",
    description="Upload a single image file with validation",
    status_code=status.HTTP_201_CREATED,
    response_description="Uploaded image details with URL"
)
async def upload_file(
    file: UploadFile, 
    current_user=Depends(get_current_user)
):
    """
    Upload an image:
    - Validate image file
    - Generate unique filename
    - Upload to MinIO bucket
    - Return presigned URL
    """
    try:
        # Validate file
        validate_image(file)
        
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{current_user.username}/{uuid.uuid4()}{ext}"
        
        # Ensure bucket exists
        if not minio_client.bucket_exists(BUCKET_NAME):
            minio_client.make_bucket(BUCKET_NAME)
        
        # Read file data
        file_data = await file.read()
        
        # Upload file to MinIO
        minio_client.put_object(
            bucket_name=BUCKET_NAME,
            object_name=unique_filename,
            data=io.BytesIO(file_data),
            length=len(file_data),
            content_type=file.content_type
        )
        
        # Generate URL
        url = minio_client.presigned_get_object(
            bucket_name=BUCKET_NAME,
            object_name=unique_filename,
            expires=timedelta(days=7)  # URL expires in 7 days
        )
        
        return {
            "url": url,
            "filename": unique_filename
        }
        
    except S3Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file to storage: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error processing file: {str(e)}"
        )
    finally:
        await file.close()

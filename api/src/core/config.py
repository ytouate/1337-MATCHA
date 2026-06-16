import os

from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "development")
IS_PRODUCTION = ENV == "production"

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:9998").split(",")
    if origin.strip()
]

COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", "localhost")
COOKIE_PATH = "/"
COOKIE_HTTPONLY = True
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = "lax"

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "storage:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "matcha")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_IMAGE_DIMENSIONS = (2000, 2000)
MAX_UPLOAD_FILES = 5

JWT_ALGORITHM = "HS256"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

FORTY_TWO_CLIENT_ID = os.getenv("FORTY_TWO_CLIENT_ID")
FORTY_TWO_CLIENT_SECRET = os.getenv("FORTY_TWO_CLIENT_SECRET")
FORTY_TWO_REDIRECT_URI = os.getenv("FORTY_TWO_REDIRECT_URI")

EMAIL_VERIFICATION_REDIRECT_URL = os.getenv("EMAIL_VERIFICATION_REDIRECT_URL")
FRONT_BASE_URL = os.getenv("FRONT_BASE_URL")
API_PUBLIC_URL = os.getenv("API_PUBLIC_URL", "http://localhost:7001").rstrip("/")

IMAGE_FORMAT_TO_MIME = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "GIF": "image/gif",
}


def validate_settings() -> None:
    if os.getenv("PYTEST_CURRENT_TEST"):
        return

    if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
        raise RuntimeError(
            "JWT_SECRET_KEY must be set and at least 32 characters long"
        )

    if not CORS_ORIGINS:
        raise RuntimeError("CORS_ORIGINS must include at least one origin")

import os
from unittest.mock import MagicMock

import pytest

# Set test env before any src imports (config reads JWT_SECRET_KEY at import time).
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-auth-fr-tests!!")
os.environ.setdefault("FRONT_BASE_URL", "http://localhost:9998")
os.environ.setdefault(
    "EMAIL_VERIFICATION_REDIRECT_URL",
    "http://localhost:7001/api/auth/email-verification",
)
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("POSTGRES_USER", "matcha")
os.environ.setdefault("POSTGRES_PASSWORD", "matcha")
os.environ.setdefault("POSTGRES_DB", "matcha")

from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from src.main import app

    return TestClient(app)


@pytest.fixture
def valid_signup_payload():
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "Xk9@mQz2",
        "first_name": "Test",
        "last_name": "User",
        "gender": "Male",
        "birthdate": "2000-01-15",
    }


@pytest.fixture
def mock_pg_cursor():
    cursor = MagicMock()
    connection = MagicMock()
    db_ctx = MagicMock()
    db_ctx.cursor = cursor
    db_ctx.connection = connection
    return cursor, connection, db_ctx


@pytest.fixture
def verified_user():
    from src.core.security import hash_password

    return {
        "id": 1,
        "email": "test@example.com",
        "username": "testuser",
        "password": hash_password("Xk9@mQz2"),
        "is_verified": True,
        "first_name": "Test",
        "last_name": "User",
    }

import asyncio
import logging
from contextlib import asynccontextmanager

import dotenv

dotenv.load_dotenv()

from fastapi import FastAPI

from src.api.endpoints.auth import router as auth_router
from src.api.endpoints.dates import router as dates_router
from src.api.endpoints.images import router as images_router
from src.api.endpoints.interests import router as interests_router
from src.api.endpoints.location import router as location_router
from src.api.endpoints.notifications import router as notifications_router
from src.api.endpoints.social import router as social_router
from src.api.endpoints.upload import router as upload_router
from src.api.endpoints.users import router as users_router
from src.api.endpoints.ws import router as ws_router
from src.core.config import IS_PRODUCTION, validate_settings
from src.core.exceptions import register_exception_handlers
from src.middleware.cors import setup_cors
from src.middleware.rate_limit import RateLimitMiddleware
from src.services import notification_service

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_settings()
    notification_service.set_event_loop(asyncio.get_running_loop())
    yield


app = FastAPI(
    title="Matcha API",
    description="API for Matcha dating application",
    version="1.0.0",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
    docs_url=None if IS_PRODUCTION else "/docs",
    lifespan=lifespan,
)

register_exception_handlers(app)
app.add_middleware(RateLimitMiddleware)
setup_cors(app)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(social_router)
app.include_router(dates_router)
app.include_router(notifications_router)
app.include_router(ws_router)
app.include_router(upload_router)
app.include_router(images_router)
app.include_router(interests_router)
app.include_router(location_router)

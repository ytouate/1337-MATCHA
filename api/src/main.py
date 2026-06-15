import dotenv
from fastapi import FastAPI

from src.api.endpoints.auth import router as auth_router
from src.api.endpoints.upload import router as upload_router
from src.api.endpoints.users import router as users_router
from src.middleware.cors import setup_cors

dotenv.load_dotenv()

app = FastAPI(
    title="Matcha API",
    description="API for Matcha dating application",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
)

setup_cors(app)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(upload_router)

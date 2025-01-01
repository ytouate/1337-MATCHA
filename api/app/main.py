from fastapi import FastAPI
import dotenv
from .routers.auth import router as auth_router
from .routers.users import router as users_router
from .routers.upload import router as upload_router
from fastapi.middleware.cors import CORSMiddleware
from .helpers.utils import DatabaseHelper

dotenv.load_dotenv()

users_table_data = DatabaseHelper.get_table_data(file_name="user.json")


app = FastAPI(
    title="Matcha API",
    description="API for Matcha dating application",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
)

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(upload_router)

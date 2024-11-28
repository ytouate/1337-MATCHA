from fastapi import FastAPI
import dotenv
from .routers.auth import router
from .helpers.utils import get_table_data
from fastapi.middleware.cors import CORSMiddleware


dotenv.load_dotenv()

users_table_data = get_table_data(file_name="user.json")
# create_table('users', users_table_data)

app = FastAPI()


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

app.include_router(router)

from fastapi import FastAPI
import dotenv
from .routers.routes import router
from .helpers.utils import get_table_data

dotenv.load_dotenv()

users_table_data = get_table_data(file_name="user.json")
# create_table('users', users_table_data)

app = FastAPI()

app.include_router(router)

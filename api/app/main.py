from fastapi import FastAPI
import dotenv
from pathlib import Path
from .database import database
from .database.queries.create_tables import create_table
import json

BASE_DIR = Path(__file__).resolve().parent.parent

dotenv.load_dotenv(BASE_DIR / ".env")

app = FastAPI()


def get_table_data():
    with open("./app/database/models/user.json") as file:
        table_data = json.load(file)
        create_table("users", table_data)


get_table_data()


@app.get("/")
async def main_route():
    with database.PgDatabase() as db:
        print(db)
    return {"message": "Hey, It is me Goku"}

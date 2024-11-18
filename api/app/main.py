from fastapi import FastAPI
import dotenv
from pathlib import Path
from .database import database

BASE_DIR = Path(__file__).resolve().parent.parent

dotenv.load_dotenv(BASE_DIR / ".env")

app = FastAPI()


@app.get("/")
async def main_route():
    with database.PgDatabase() as db:
        print(db)
    return {"message": "Hey, It is me Goku"}

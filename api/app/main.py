from fastapi import FastAPI
import dotenv
from pathlib import Path
from .database import database
from .database.queries.create_tables import create_table

BASE_DIR = Path(__file__).resolve().parent.parent

dotenv.load_dotenv(BASE_DIR / ".env")

app = FastAPI()

@app.on_event("startup")
async def on_startup():
    query = create_table('users', [
        {
            "name": 'id',
            "type": {
                "type": 'SERIAL',
            },
        },
        {
            "name": 'first_name',
            "type": {
                "type": 'VARCHAR(28)',
            },
            "is_null": True,
            "is_blank": True,
        },
        {
            "name": 'last_name',
            "type": {
                "type": 'VARCHAR(28)',
            },
            "is_null": True,
            "is_blank": True,
        },
        {
            "name": 'email',
            "type": {
                "type": 'VARCHAR(255)',
            },
            "is_null": True,
            "is_blank": True,
            "is_primary": True
        },
        {
            "name": 'username',
            "type": {
                "type": 'VARCHAR(16)',
            },
            "is_null": True,
            "is_blank": True,
            "is_primary": True
        },
        {
            "name": 'bio',
            "type": {
                "type": 'VARCHAR(16)',
            },
        },
        {
            "name": 'latitude',
            "type": {
                "type": 'DECIMAL(9, 6)',
            },
        },
        {
            "name": 'longitude',
            "type": {
                "type": 'DECIMAL(9, 6)',
            },
        },
        {
            "name": 'is_verified',
            "type": {
                "type": 'BOOLEAN',
            },
            "default": 'FALSE',
        },
        {
            "name": 'gender',
            "type": {
                "type": "ENUM",
                "enum": ['Male', 'Female']
            }
        },
        {
            "name": 'sexual_preference',
            "type": {
                "type": "ENUM",
                "enum": ['Male', 'Female']
            }
        },
        {
            "name": 'created_at',
            "type": {
                "type": 'TIMESTAMP',
            },
            "default": 'CURRENT_TIMESTAMP',
        },
        {
            "name": 'updated_at',
            "type": {
                "type": 'TIMESTAMP',
            },
            "default": 'CURRENT_TIMESTAMP',
        },
    ])

@app.get("/")
async def main_route():
    with database.PgDatabase() as db:
        print(db)
    return {"message": "Hey, It is me Goku"}

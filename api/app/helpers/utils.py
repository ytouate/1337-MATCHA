from passlib.context import CryptContext
import json
from ..database.queries.create_tables import create_table

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_table_data(file_path):
    with open(file_path) as file:
        table_data = json.load(file)
    return table_data

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
import os
import dotenv
import json
from typing import List
from ..database.database import PgDatabase
from .schemas import Column
from jinja2 import Template

dotenv.load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("EMAIL_HOST_USER"),
    MAIL_PASSWORD=os.getenv("EMAIL_HOST_PASSWORD"),
    MAIL_FROM=os.getenv("EMAIL_HOST_USER"),
    MAIL_PORT=os.getenv("EMAIL_PORT"),
    MAIL_SERVER=os.getenv("EMAIL_HOST"),
    MAIL_SSL_TLS=False,
    MAIL_STARTTLS=True,
)


def get_table_data(file_name):
    file_path = os.path.join(
        os.path.dirname(__file__), "..", "database", "models", file_name
    )
    with open(file_path) as file:
        table_data = json.load(file)
    return table_data


def get_email_body(file_name, link):
    file_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "template",
        file_name,
    )
    with open(file_path) as file:
        file_content = file.read()
    template_email = Template(file_content)
    return template_email.render(link=link)


async def send_email(subject: str, email_to: str):
    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        body=get_email_body(
            file_name="email_confirmation.html",
            link="https://google.com",
        ),
        subtype=MessageType.html,
    )
    fm = FastMail(conf)
    await fm.send_message(message)


def get_type(name, type: dict) -> str:
    if type["type"] != "ENUM":
        return type["type"]

    check_query = f"""
        SELECT 1
        FROM pg_type
        JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE typname = 't_{name}' AND nspname = 'public';
    """

    create_query = f"""
        CREATE TYPE t_{name} AS ENUM ({', '.join([f"{e}" for e in type.get("enum", [])])});
    """

    exists = run_query(query=check_query, commit=False)
    if not exists:
        run_query(create_query)

    return f"t_{name}"


def generate_column_definitions(columns):
    def build_column_definition(column):
        type_column = get_type(column["name"], column["type"])

        constraints = [
            ("NOT NULL", not column.get("is_null", True)),
            (f"CHECK ({column['name']} <> '')", not column.get("is_blank", True)),
            (
                f"DEFAULT {str(column.get("default", None))}",
                column.get("default", None) is not None,
            ),
            ("PRIMARY KEY", column.get("is_primary", False)),
            ("UNIQUE", column.get("is_unique", False)),
        ]

        applied_constraints = [
            constraint for constraint, condition in constraints if condition
        ]

        return f"{column['name']} {type_column} {' '.join(applied_constraints)}"

    return [build_column_definition(column) for column in columns]


def create_table(name: str, columns: List[Column]):
    columns_definition = generate_column_definitions(columns=columns)
    query = f"CREATE TABLE {name} (\n{",".join(columns_definition)}\n);"
    run_query(query)


def run_query(query: str, commit=True):
    with PgDatabase() as db:
        db.cursor.execute(query)
        result = db.cursor.rowcount
        if commit:
            db.connection.commit()
        return result


def check_field_exist(table, field, value) -> bool:
    query = f"""
    SELECT 1
    FROM {table}
    WHERE {field} = %s
    LIMIT 1;
    """
    with PgDatabase() as db:
        db.cursor.execute(query, (value,))
        result = db.cursor.fetchone()
        return bool(result)


def create_row(table, data: dict):
    keys = data.keys()
    values = data.values()
    query = f"""INSERT INTO {table} ({', '.join(keys)})
    VALUES ({', '.join([f"'{value}'" for value in values])});
    """
    run_query(query)

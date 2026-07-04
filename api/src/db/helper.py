import json
import os
import re
from typing import List, Union

from src.db.database import PgDatabase
from src.schemas.user import Column


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

    exists = DatabaseHelper.run_query(query=check_query, commit=False)
    if not exists:
        DatabaseHelper.run_query(create_query)

    return f"t_{name}"


class DatabaseHelper:
    @staticmethod
    def get_table_data(file_name):
        file_path = os.path.join(
            os.path.dirname(__file__), "..", "models", file_name
        )
        with open(file_path) as file:
            table_data = json.load(file)
        return table_data

    @staticmethod
    def field_exists(table: str, field: str, value: str) -> bool:
        query = f"SELECT EXISTS(SELECT 1 FROM {table} WHERE {field} = %s) as exists"
        with PgDatabase() as db:
            db.cursor.execute(
                query,
                (DatabaseHelper.escape_special_characters(value),),
            )
            result = db.cursor.fetchone()
            return result["exists"] if result else False

    @staticmethod
    def update_database_value(
        table_name: str,
        field_to_update: str,
        new_value: Union[str, int, bool],
        condition_field: str,
        condition_value: str,
    ):
        if not DatabaseHelper.field_exists(
            table=table_name, field=condition_field, value=condition_value
        ):
            return False

        query = f"""
        UPDATE {table_name}
        SET {field_to_update} = '{DatabaseHelper.escape_special_characters(new_value)}'
        WHERE {condition_field} = '{DatabaseHelper.escape_special_characters(condition_value)}'
        """

        DatabaseHelper.run_query(query=query)
        return True

    @staticmethod
    def create_row(table, data: dict):
        keys = data.keys()
        values = data.values()
        query = f"""INSERT INTO {table} ({', '.join(keys)})
        VALUES ({', '.join([f"'{DatabaseHelper.escape_special_characters(value)}'" for value in values])});
        """
        DatabaseHelper.run_query(query)

    @staticmethod
    def escape_special_characters(value):
        if isinstance(value, str):
            return re.sub(r"([%_\'\"\\])", r"\\\1", value)
        return value

    @staticmethod
    def generate_column_definitions(columns):
        def build_column_definition(column):
            type_column = get_type(column["name"], column["type"])

            constraints = [
                ("NOT NULL", not column.get("is_null", True)),
                (f"CHECK ({column['name']} <> '')", not column.get("is_blank", True)),
                (
                    f"DEFAULT {str(column.get('default', None))}",
                    column.get("default", None) is not None,
                ),
                ("PRIMARY KEY", column.get("is_primary", False)),
                ("UNIQUE", column.get("is_unique", False)),
            ]

            if "references" in column:
                ref = column["references"]
                fk_constraint = (
                    f"REFERENCES {ref['table']}({ref['column']})"
                    + (
                        f" ON DELETE {ref['on_delete']}"
                        if "on_delete" in ref
                        else "CASCADE"
                    ),
                    True,
                )
                constraints.append(fk_constraint)

            applied_constraints = [
                constraint for constraint, condition in constraints if condition
            ]

            return f"{column['name']} {type_column} {' '.join(applied_constraints)}"

        return [build_column_definition(column) for column in columns]

    @staticmethod
    def create_table(name: str, columns: List[Column]):
        columns_definition = DatabaseHelper.generate_column_definitions(columns=columns)
        query = (
            f"CREATE TABLE IF NOT EXISTS {name} (\n{','.join(columns_definition)}\n);"
        )
        DatabaseHelper.run_query(query)

    @staticmethod
    def run_query(query: str, commit=True):
        with PgDatabase() as db:
            db.cursor.execute(query)
            result = db.cursor.rowcount
            if commit:
                db.connection.commit()
            return result

    @staticmethod
    def _migrations_dir() -> str:
        return os.path.join(os.path.dirname(__file__), "..", "..", "migrations")

    @staticmethod
    def _split_sql_script(sql: str) -> List[str]:
        lines = []
        for line in sql.splitlines():
            if line.strip().startswith("--"):
                continue
            lines.append(line)
        cleaned = "\n".join(lines)
        return [part.strip() for part in cleaned.split(";") if part.strip()]

    @staticmethod
    def run_sql_script(sql: str, commit: bool = True) -> None:
        statements = DatabaseHelper._split_sql_script(sql)
        with PgDatabase() as db:
            for statement in statements:
                db.cursor.execute(statement)
            if commit:
                db.connection.commit()

    @staticmethod
    def apply_migrations() -> None:
        skip = {"003_drop_images_interests.sql"}
        migrations_dir = DatabaseHelper._migrations_dir()
        for filename in sorted(os.listdir(migrations_dir)):
            if not filename.endswith(".sql") or filename in skip:
                continue
            path = os.path.join(migrations_dir, filename)
            with open(path, encoding="utf-8") as file:
                DatabaseHelper.run_sql_script(file.read())

    @staticmethod
    def create_tables():
        interest_columns = DatabaseHelper.get_table_data("interest.json")
        user_interest_columns = DatabaseHelper.get_table_data("user_interest.json")
        image_columns = DatabaseHelper.get_table_data("image.json")
        user_columns = DatabaseHelper.get_table_data("user.json")
        user_views = DatabaseHelper.get_table_data("user_view.json")
        user_likes = DatabaseHelper.get_table_data("user_like.json")
        user_blocks = DatabaseHelper.get_table_data("user_block.json")
        user_reports = DatabaseHelper.get_table_data("user_report.json")
        chat_messages = DatabaseHelper.get_table_data("chat_message.json")
        notifications = DatabaseHelper.get_table_data("notification.json")
        date_proposals = DatabaseHelper.get_table_data("date_proposal.json")

        DatabaseHelper.create_table("users", user_columns)
        DatabaseHelper.create_table("interests", interest_columns)
        DatabaseHelper.create_table("images", image_columns)
        DatabaseHelper.create_table("user_interests", user_interest_columns)
        DatabaseHelper.create_table("user_views", user_views)
        DatabaseHelper.create_table("user_likes", user_likes)
        DatabaseHelper.create_table("user_blocks", user_blocks)
        DatabaseHelper.create_table("user_reports", user_reports)
        DatabaseHelper.create_table("chat_messages", chat_messages)
        DatabaseHelper.create_table("notifications", notifications)
        DatabaseHelper.create_table("date_proposals", date_proposals)
        DatabaseHelper.apply_migrations()

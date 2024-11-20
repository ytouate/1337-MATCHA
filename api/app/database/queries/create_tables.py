from typing import List
from ..database import PgDatabase
from ...helpers.schemas import Column


def get_type(name: str, type: dict) -> str:
    if type["type"] != "ENUM":
        return type["type"]

    check_query = f"""
        SELECT 1
        FROM pg_type
        JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE typname = 't_{name}' AND nspname = 'public';
    """

    create_query = f"""
        CREATE TYPE t_{name} AS ENUM ({', '.join([f"'{e}'" for e in type['enum']])});
    """

    with PgDatabase() as db:
        db.cursor.execute(check_query)
        exists = db.cursor.fetchone()

        if not exists:
            db.cursor.execute(create_query)
            db.connection.commit()

    return f"t_{name}"


def generate_column_definitions(columns):
    def build_column_definition(column):
        type_column = get_type(column["name"], column["type"])

        constraints = [
            ("NOT NULL", not column.get("is_null", False)),
            (f"CHECK ({column['name']} <> '')", column.get("is_blank", False)),
            (
                f"DEFAULT {str(column.get("default", None))}",
                column.get("default", None) is not None,
            ),
            ("PRIMARY KEY", column.get("is_primary", False)),
        ]

        applied_constraints = [
            constraint for constraint, condition in constraints if condition
        ]

        return f"{column['name']} {type_column} {' '.join(applied_constraints)}"

    return [build_column_definition(column) for column in columns]


def create_table(name: str, columns: List[Column]) -> str:
    try:
        columns_definition = generate_column_definitions(columns=columns)
        query = f"CREATE TABLE {name} (\n{",".join(columns_definition)}\n);"
        with PgDatabase() as db:
            db.cursor.execute(query)
            db.connection.commit()
        return query
    except Exception as e:
        print(f"Error: {e}")
        return str(e)

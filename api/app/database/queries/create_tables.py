from typing import List
from ...helpers.schemas import Column
from ...helpers.db import run_query


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

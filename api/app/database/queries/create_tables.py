from pydantic import BaseModel
from typing import Optional, List
from ..database import PgDatabase


class Type(BaseModel):
    type: str
    enum: Optional[List[str]] = None


class Column(BaseModel):
    name: str
    type: Type
    is_null: bool = False
    is_blank: bool = False
    is_primary: bool = False
    default: Optional[str] = None


def get_type(name: str, type: Type) -> str:
    if type.type != "ENUM":
        return type.type

    query = f"CREATE TYPE t_{name} AS ENUM ({', '.join([str(e) for e in type.enum])});"
    with PgDatabase() as db:
        db.cursor.execute(query)
        db.connection.commit()
    return f"t_{name}"


def generate_column_definitions(columns):
    def build_column_definition(column):
        type_column = get_type(column.name, column.type)

        # List of conditions and corresponding constraints
        constraints = [
            ("NOT NULL", not column.is_null),
            (f"CHECK ({column.name} <> '')", column.is_blank),
            (f"DEFAULT {repr(column.default)}", column.default is not None),
            ("PRIMARY KEY", column.is_primary),
        ]

        # Filter constraints based on conditions
        applied_constraints = [
            constraint for constraint, condition in constraints if condition
        ]

        # Combine the type and constraints
        return f"{column.name} {type_column} {' '.join(applied_constraints)}"

    return [build_column_definition(column) for column in columns]


def create_table(name: str, columns: List[Column]) -> str:
    try:
        columns_definition = generate_column_definitions(columns=columns)
        query = f"CREATE TABLE {name} (\n{columns_definition}\n);"
        with PgDatabase() as db:
            db.cursor.execute(query)
            db.connection.commit()
        return query
    except Exception as e:
        print(f"Error: {e}")
        return str(e)

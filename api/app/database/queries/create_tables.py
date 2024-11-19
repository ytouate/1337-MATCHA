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
def setType(name: str, type: Type) -> str:
    if type.type != 'ENUM':
        return type.type
    # If type is ENUM, create ENUM types
    query = f"CREATE TYPE {name}_type AS ENUM ({', '.join([repr(e) for e in type.enum])});"
    with PgDatabase() as db:
        db.cursor.execute(query)
        db.connection.commit()
    return f"{name}_type"

def table_exist(name: str) -> bool:
    query = """
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = %s
          AND table_schema = 'public'  -- Ensure you're checking the public schema
    );
    """
    with PgDatabase() as db:
        db.cursor.execute(query, (name,))
        result = db.cursor.fetchone()
        print(f"Table is_exist: {result[0]}")
        return result[0]

def create_table(name: str, columns: List[Column]) -> str:
    try:
        if not table_exist(name):
            lines = []
            for column in columns:
                type_column = setType(column.name, column.type)
                column_definition = f"{column.name} {type_column}"
                if not column.is_null:
                    column_definition += " NOT NULL"
                if column.is_blank:
                    column_definition += f" CHECK ({column.name} <> '')"
                if column.default:
                    column_definition += f" DEFAULT {repr(column.default)}"
                if column.is_primary:
                    column_definition += " PRIMARY KEY"
                lines.append(column_definition.strip())

            columns_definition = ",\n".join(lines)
            query = f"CREATE TABLE {name} (\n{columns_definition}\n);"
            
            with PgDatabase() as db:
                db.cursor.execute(query)
                db.connection.commit()
            return queryg
        else:
            raise ValueError(f"Table '{name}' already exists")
    except Exception as e:
        print(f"Error: {e}")
        return str(e)

from pydantic import BaseModel
from typing import Optional, List

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

def create_table(name: str, columns: List[Column]) -> str:
    lines = []
    for column in columns:
        line = (
            f"{column.name} "
            f"{column.type.type if not column.is_autoinc else ''} "
            f"{f'CHECK ({column.name} IN ({', '.join(column.type.enum)})' if column.type.enum else ''} "
            f"{'NOT NULL' if not column.is_null else ''} "
            f"{f'CHECK ({column.name} <> \'\')' if column.is_blank else ''} "
            f"{f'DEFAULT {column.default}' if column.default else ''} "
            f"{'PRIMARY KEY' if not column.is_primary else ''} "
        )
        lines.append(line.strip())
    columns_definition = ",\n".join(lines)
    query = f"CREATE TABLE {name} (\n{columns_definition}\n);"
    return query

query = create_table(User, [
    {
        name : 'id',
        type : {
            type : 'SERIAL',
        },
    },
    {
        name : 'first_name',
        type : {
            type : 'VARCHAR(28)',
        },
        is_null : True,
        is_blank : True,
    },
    {
        name : 'last_name',
        type : {
            type : 'VARCHAR(28)',
        },
        is_null : True,
        is_blank : True,
    },
    {
        name : 'email',
        type : {
            type : 'VARCHAR(255)',
        },
        is_null : True,
        is_blank : True,
        is_primary : True
    },
    {
        name : 'username',
        type : {
            type : 'VARCHAR(16)',
        },
        is_null : True,
        is_blank : True,
        is_primary : True
    },
    {
        name : 'bio',
        type : {
            type : 'VARCHAR(16)',
        },
    },
    {
        name : 'latitude',
        type : {
            type : 'DECIMAL(9, 6)',
        },
    },
    {
        name : 'longitude',
        type : {
            type : 'DECIMAL(9, 6)',
        },
    },
     {
        name : 'longitude',
        type : {
            type : 'DECIMAL(9, 6)',
        },
    },
    {
        name : 'is_verified',
        type : {
            type : 'BOOLEAN',
        },
        default : 'FALSE',
    },
    {
        name : 'created_at',
        type : {
            type : 'TIMESTAMP',
        },
        default : 'CURRENT_TIMESTAMP',
    },
    {
        name : 'updated_at',
        type : {
            type : 'TIMESTAMP',
        },
        default : 'CURRENT_TIMESTAMP',
    },
])
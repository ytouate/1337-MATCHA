from ..database.database import PgDatabase


def run_query(query: str, commit=True):
    with PgDatabase() as db:
        db.cursor.execute(query)
        result = db.cursor.rowcount
        print(query, result)
        if commit:
            db.connection.commit()
        return result


def check_exist(table, field, value) -> bool:
    query = f"""SELECT 1
    FROM {table}
    WHERE {field} = '{value}';
    """
    return not bool(run_query(query, commit=False))

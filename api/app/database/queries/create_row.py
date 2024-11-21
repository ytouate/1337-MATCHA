from ...helpers.db import run_query

def create_row(table, data: dict):
    keys = data.keys()
    values = data.values()
    query = f"""INSERT INTO {table} ({', '.join(keys)})
    VALUES ({', '.join([f"'{value}'" for value in values])});
    """
    run_query(query)
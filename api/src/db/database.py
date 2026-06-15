from abc import ABC, abstractmethod
import os

import dotenv
import psycopg

dotenv.load_dotenv()


class Database(ABC):
    """Database context manager."""

    def __init__(self, driver) -> None:
        self.driver = driver

    @abstractmethod
    def connect_to_database(self):
        raise NotImplementedError()

    def __enter__(self):
        self.connection = self.connect_to_database()
        self.cursor = self.connection.cursor()
        return self

    def __exit__(self, exception_type, exc_val, traceback):
        if exception_type is None:
            self.connection.commit()
        else:
            self.connection.rollback()
        self.cursor.close()
        self.connection.close()


class PgDatabase(Database):
    def __init__(self):
        self.driver = psycopg
        super().__init__(self.driver)

    def connect_to_database(self):
        return self.driver.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            user=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            dbname=os.getenv("POSTGRES_DB"),
            row_factory=psycopg.rows.dict_row,
        )

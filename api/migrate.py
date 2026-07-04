from src.db.helper import DatabaseHelper

if __name__ == "__main__":
    DatabaseHelper.apply_migrations()
    print("Migrations applied.")

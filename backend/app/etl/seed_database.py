import pandas as pd
import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from app.core.database import engine

DATA_DIR = "/Users/ahmed/Ynov/Specialization Project/data"

TABLES_ORDER = [
    "academic_years",
    "programs",
    "modules",
    "users",
    "cohorts",
    "teachers",
    "students",
    "cohort_modules",
    "evaluations",
    "grades",
]


def seed_database():
    print("Starting database population pipeline...")

    with engine.begin() as conn:

        print("Cleaning existing data...")
        for table in reversed(TABLES_ORDER):
            conn.execute(text(f'TRUNCATE TABLE "{table}" CASCADE;'))

        print("Loading CSV files into PostgreSQL...")
        for table in TABLES_ORDER:
            file_path = os.path.join(DATA_DIR, f"{table}.csv")

            if not os.path.exists(file_path):
                print(f"Warning: {file_path} not found. Skipping...")
                continue

            df = pd.read_csv(file_path)

            df.to_sql(name=table, con=conn, if_exists="append", index=False)
            print(f"Successfully inserted {len(df)} rows into '{table}'.")

    print("Database seeding complete. The database is ready.")


if __name__ == "__main__":
    seed_database()

import pandas as pd
import os
import sys
from app.core.database import engine, Base, SessionLocal
from app.models.system import User
from app.models.student import Student, Teacher
from app.models.academic import (
    AcademicYear,
    Program,
    Cohort,
    Module,
    CohortModule,
    Evaluation,
    Grade,
    AttendanceRecord,
)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

DATA_DIR = "/Users/ahmed/Ynov/Specialization Project/data"

#!!!! CORRECT ORDER: Parents must come before children
TABLES_CONFIG = [
    ("academic_years.csv", AcademicYear),
    ("programs.csv", Program),
    ("cohorts.csv", Cohort),
    ("users.csv", User),
    ("modules.csv", Module),
    ("teachers.csv", Teacher),
    ("students.csv", Student),
    ("cohort_modules.csv", CohortModule),
    ("evaluations.csv", Evaluation),
    ("grades.csv", Grade),
    ("attendance_records.csv", AttendanceRecord),
]


def seed_database():
    print("--- Starting Full-Integrity ORM Seeding ---")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for filename, Model in TABLES_CONFIG:
            file_path = os.path.join(DATA_DIR, filename)
            if not os.path.exists(file_path):
                print(f"Skipping {filename} (not found)")
                continue

            df = pd.read_csv(file_path)
            print(f"Importing {filename} ({len(df)} rows)...")

            for _, row in df.iterrows():
                data = {k: v for k, v in row.to_dict().items() if hasattr(Model, k)}
                db.add(Model(**data))

            db.commit()

        print("--- Seeding Complete: All constraints satisfied ---")
    except Exception as e:
        db.rollback()
        print(f" Critical Seeding Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

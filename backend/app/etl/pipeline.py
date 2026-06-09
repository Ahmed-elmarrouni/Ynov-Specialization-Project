import pandas as pd
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.system import User, DataImport
from app.core import security


def process_student_import(df: pd.DataFrame, db: Session, user_id: int, file_name: str):
    """
    Cleans student data and persists it to User and Student tables.
    Returns the DataImport record with results.
    """
    # 1. Import Record
    import_record = DataImport(
        uploaded_by=user_id,
        file_name=file_name,
        total_rows=len(df),
        status="Processing",
    )
    db.add(import_record)
    db.flush()

    # 2. Data Cleaning
    df = df.drop_duplicates(subset=["email"])
    df["email"] = df["email"].str.strip().str.lower()

    success_count = 0
    error_count = 0
    errors = []

    # 3. Persistence Logic
    for _, row in df.iterrows():
        try:
            # CheckinG if user already exists
            existing_user = db.query(User).filter(User.email == row["email"]).first()
            if existing_user:
                error_count += 1
                errors.append(f"Row {row.name}: User {row['email']} already exists.")
                continue

            # Create User entry
            new_user = User(
                first_name=row.get("first_name"),
                last_name=row.get("last_name"),
                email=row["email"],
                role="student",
                password_hash=security.hash_password("temporary_pass123"),
            )
            db.add(new_user)
            db.flush()

            # Create Student entry
            new_student = Student(
                user_id=new_user.id,
                student_id_number=row.get("student_id_number"),
                cohort_id=row.get("cohort_id"),
            )
            db.add(new_student)
            success_count += 1

        except Exception as e:
            error_count += 1
            errors.append(f"Row {row.name}: {str(e)}")

    # 4. Finalize Import Record
    import_record.success_rows = success_count
    import_record.error_rows = error_count
    import_record.status = "Completed" if error_count == 0 else "Completed with Errors"
    import_record.error_log = {"errors": errors}

    db.commit()
    return import_record

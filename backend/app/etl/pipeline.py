import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.student import Student
from app.models.academic import Module, Grade, Program, Cohort, AcademicYear, AttendanceRecord, Evaluation
from app.models.system import User, DataImport
from app.core import security
from app.etl.cleaner import ETLDataCleaner


def process_import_payload(df: pd.DataFrame, db: Session, user_id: int, file_name: str, target_table: str):
    """
    Central ETL Router: Routes the validated DataFrame to the specific table's processing logic.
    """
    schemas = {
        "students": ['first_name', 'last_name', 'email', 'student_id_number', 'cohort_id'],
        "grades": ['evaluation_id', 'student_id', 'score', 'is_absent'],
        "attendance": ['session_id', 'student_id', 'status'],
        "modules": ['code', 'name', 'credits'],
        "programs": ['name', 'department', 'degree_level'],
        "cohorts": ['program_id', 'academic_year_id', 'name'],
        "evaluations": ['cohort_module_id', 'title', 'type', 'weight_percentage', 'max_score', 'evaluation_date'],
        "academic_years": ['name', 'start_date', 'end_date', 'is_current']
    }

    req_cols = schemas.get(target_table, [])
    if req_cols:
        df = ETLDataCleaner.process(df, target_table, req_cols)

    import_record = DataImport(
        uploaded_by=user_id,
        file_name=file_name,
        file_type=target_table,
        total_rows=len(df),
        status="Processing",
    )
    db.add(import_record)
    db.flush()

    if target_table == "students":
        success, error, err_list = _process_students(df, db)
    elif target_table == "modules":
        success, error, err_list = _process_generic(df, db, Module, "code")
    elif target_table == "programs":
        success, error, err_list = _process_generic(df, db, Program, "name")
    elif target_table == "cohorts":
        success, error, err_list = _process_generic(df, db, Cohort, "name")
    elif target_table == "academic_years":
        success, error, err_list = _process_generic(df, db, AcademicYear, "name")
    elif target_table == "evaluations":
        success, error, err_list = _process_generic(df, db, Evaluation, "id")
    elif target_table == "grades":
        success, error, err_list = _process_grades(df, db)
    elif target_table == "attendance":
        success, error, err_list = _process_attendance(df, db)
    else:
        success, error, err_list = 0, len(df), [f"Unknown target table: {target_table}"]

    import_record.success_rows = success
    import_record.error_rows = error
    import_record.status = "Completed" if error == 0 else "Completed with Errors"
    import_record.error_log = {"errors": err_list}

    db.commit()
    return import_record


def _process_generic(df: pd.DataFrame, db: Session, ModelClass, unique_field: str):
    """A generic upsert processor for simple tables without complex relations."""
    success, error, errors = 0, 0, []
    for _, row in df.iterrows():
        try:
            record = None
            if unique_field in row and pd.notna(row[unique_field]):
                record = db.query(ModelClass).filter(getattr(ModelClass, unique_field) == row[unique_field]).first()
            
            if record:
                for col in df.columns:
                    setattr(record, col, row[col])
            else:
                new_record = ModelClass(**row.to_dict())
                db.add(new_record)
            success += 1
        except Exception as e:
            error += 1
            errors.append(f"Row {row.name}: {str(e)}")
    return success, error, errors


def _process_students(df: pd.DataFrame, db: Session):
    success, error, errors = 0, 0, []
    
    try:
        db.execute(text("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);"))
        db.execute(text("SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 1), true);"))
    except: pass

    for _, row in df.iterrows():
        try:
            user = db.query(User).filter(User.email == row["email"]).first()
            if user:
                user.first_name = row.get("first_name", user.first_name)
                user.last_name = row.get("last_name", user.last_name)
            else:
                user = User(
                    first_name=row.get("first_name"),
                    last_name=row.get("last_name"),
                    email=row["email"],
                    role="student",
                    password_hash=security.hash_password("temporary_pass123"),
                )
                db.add(user)
                db.flush()

            student = db.query(Student).filter(Student.user_id == user.id).first()
            if student:
                student.student_id_number = row.get("student_id_number", student.student_id_number)
                student.cohort_id = row.get("cohort_id", student.cohort_id)
            else:
                student = Student(user_id=user.id, student_id_number=row.get("student_id_number"), cohort_id=row.get("cohort_id"))
                db.add(student)
            success += 1
        except Exception as e:
            error += 1
            errors.append(f"Row {row.name}: {str(e)}")
    return success, error, errors


def _process_grades(df: pd.DataFrame, db: Session):
    success, error, errors = 0, 0, []
    for _, row in df.iterrows():
        try:
            grd = db.query(Grade).filter(Grade.evaluation_id == row["evaluation_id"], Grade.student_id == row["student_id"]).first()
            
            score = row.get("score", 0.0)
            is_absent = row.get("is_absent", False)

            if grd:
                grd.score = score
                grd.is_absent = is_absent
            else:
                grd = Grade(evaluation_id=row["evaluation_id"], student_id=row["student_id"], score=score, is_absent=is_absent)
                db.add(grd)
            success += 1
        except Exception as e:
            error += 1
            errors.append(f"Row {row.name}: {str(e)}")
    return success, error, errors


def _process_attendance(df: pd.DataFrame, db: Session):
    success, error, errors = 0, 0, []
    for _, row in df.iterrows():
        try:
            att = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == row["session_id"], AttendanceRecord.student_id == row["student_id"]).first()
            if att:
                att.status = row["status"]
            else:
                att = AttendanceRecord(session_id=row["session_id"], student_id=row["student_id"], status=row["status"])
                db.add(att)
            success += 1
        except Exception as e:
            error += 1
            errors.append(f"Row {row.name}: {str(e)}")
    return success, error, errors
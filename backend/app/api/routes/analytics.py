from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from pydantic import BaseModel

from app.core.database import get_db
from app.models.student import Student
from app.models.academic import Grade, AttendanceRecord
from app.models.system import User

router = APIRouter()


#  Pydantic Schemas for Response Serialization
class GlobalStats(BaseModel):
    total_students: int
    overall_average: float
    global_absence_rate: float

    class Config:
        from_attributes = True


class AtRiskStudent(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    average_grade: float
    total_absences: int

    class Config:
        from_attributes = True


#  API Routes
@router.get("/global-stats", response_model=GlobalStats)
def get_global_stats(db: Session = Depends(get_db)):
    """
    Calculates total students, the overall average grade,
    and the global absence rate from all records.
    """
    # 1. Total number of students
    total_students = db.query(func.count(Student.id)).scalar() or 0

    # 2. Overall average grade (from all non-absent scores)
    overall_average = (
        db.query(func.avg(Grade.score)).filter(Grade.is_absent == False).scalar() or 0.0
    )

    # 3. Global absence rate
    # Percentage of attendance records marked as 'Absent'
    total_attendance_records = db.query(func.count(AttendanceRecord.id)).scalar() or 0
    if total_attendance_records > 0:
        absences = (
            db.query(func.count(AttendanceRecord.id))
            .filter(AttendanceRecord.status == "Absent")
            .scalar()
            or 0
        )
        global_absence_rate = (absences / total_attendance_records) * 100
    else:
        global_absence_rate = 0.0

    return {
        "total_students": total_students,
        "overall_average": round(overall_average, 2),
        "global_absence_rate": round(global_absence_rate, 2),
    }


@router.get("/at-risk", response_model=List[AtRiskStudent])
def get_at_risk_students(db: Session = Depends(get_db)):
    """
    Returns students meeting the 'at-risk' criteria:
    - Average grade < 10.0
    - OR total absences > 3
    """
    # Subquery for grades per student
    grade_sub = (
        db.query(Grade.student_id, func.avg(Grade.score).label("avg_score"))
        .filter(Grade.is_absent == False)
        .group_by(Grade.student_id)
        .subquery()
    )

    # Subquery for absences per student
    absence_sub = (
        db.query(
            AttendanceRecord.student_id,
            func.count(AttendanceRecord.id).label("absence_count"),
        )
        .filter(AttendanceRecord.status == "Absent")
        .group_by(AttendanceRecord.student_id)
        .subquery()
    )

    # Join Student with User (for names) and subqueries
    results = (
        db.query(
            Student.id,
            User.first_name,
            User.last_name,
            func.coalesce(grade_sub.c.avg_score, 0.0).label("avg_grade"),
            func.coalesce(absence_sub.c.absence_count, 0).label("total_abs"),
        )
        .join(User, Student.user_id == User.id)
        .outerjoin(grade_sub, Student.id == grade_sub.c.student_id)
        .outerjoin(absence_sub, Student.id == absence_sub.c.student_id)
        .filter((grade_sub.c.avg_score < 10.0) | (absence_sub.c.absence_count > 3))
        .all()
    )

    at_risk_list = [
        AtRiskStudent(
            student_id=r.id,
            first_name=r.first_name,
            last_name=r.last_name,
            average_grade=round(r.avg_grade, 2),
            total_absences=r.total_abs,
        )
        for r in results
    ]

    return at_risk_list

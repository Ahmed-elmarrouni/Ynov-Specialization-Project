from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.core.database import get_db
from app.models.student import Student
from app.models.academic import Grade, AttendanceRecord, Cohort
from app.models.system import User

router = APIRouter()


# --- Schemas ---
class GlobalStats(BaseModel):
    total_students: int
    overall_average: float
    global_absence_rate: float
    pass_rate: float


class ClassComparison(BaseModel):
    cohort_name: str
    avg_grade: float
    absence_rate: float


class AtRiskStudent(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    average_grade: float
    total_absences: int
    recommendation: str


# --- API Routes ---
@router.get("/global-stats", response_model=GlobalStats)
def get_global_stats(db: Session = Depends(get_db)):
    """
    Calculates KPIs including the overall pass rate (students with avg >= 10).
    """
    total_students = db.query(func.count(Student.id)).scalar() or 0
    overall_average = (
        db.query(func.avg(Grade.score)).filter(Grade.is_absent == False).scalar() or 0.0
    )
    # Pass Rate Calculation
    student_avgs = (
        db.query(func.avg(Grade.score).label("avg"))
        .group_by(Grade.student_id)
        .subquery()
    )
    passing_students = (
        db.query(func.count(student_avgs.c.avg))
        .filter(student_avgs.c.avg >= 10.0)
        .scalar()
        or 0
    )
    pass_rate = (passing_students / total_students * 100) if total_students > 0 else 0.0
    # Absence Rate
    total_att = db.query(func.count(AttendanceRecord.id)).scalar() or 0
    absences = (
        db.query(func.count(AttendanceRecord.id))
        .filter(AttendanceRecord.status == "Absent")
        .scalar()
        or 0
    )
    absence_rate = (absences / total_att * 100) if total_att > 0 else 0.0
    return {
        "total_students": total_students,
        "overall_average": round(overall_average, 2),
        "global_absence_rate": round(absence_rate, 2),
        "pass_rate": round(pass_rate, 2),
    }


@router.get("/class-comparison", response_model=List[ClassComparison])
def get_class_comparison(db: Session = Depends(get_db)):
    """
    Compares average grades and absence rates across cohorts.
    """
    # Subquery for student stats per cohort
    stats = (
        db.query(
            Cohort.name.label("name"),
            func.avg(Grade.score).label("grade"),
            func.count(AttendanceRecord.id).label("total_att"),
            func.sum(
                func.cast(AttendanceRecord.status == "Absent", func.Integer)
            ).label("abs"),
        )
        .select_from(Cohort)
        .join(Student, Student.cohort_id == Cohort.id)
        .outerjoin(Grade, Grade.student_id == Student.id)
        .outerjoin(AttendanceRecord, AttendanceRecord.student_id == Student.id)
        .group_by(Cohort.name)
        .all()
    )
    return [
        ClassComparison(
            cohort_name=s.name,
            avg_grade=round(s.grade or 0, 2),
            absence_rate=round(
                (s.abs / s.total_att * 100) if s.total_att and s.total_att > 0 else 0, 2
            ),
        )
        for s in stats
    ]


@router.get("/at-risk", response_model=List[AtRiskStudent])
def get_at_risk_students(db: Session = Depends(get_db)):
    """
    Identifies at-risk students and provides pedagogical recommendations.
    """
    grade_sub = (
        db.query(Grade.student_id, func.avg(Grade.score).label("avg_score"))
        .group_by(Grade.student_id)
        .subquery()
    )
    absence_sub = (
        db.query(
            AttendanceRecord.student_id,
            func.count(AttendanceRecord.id).label("abs_count"),
        )
        .filter(AttendanceRecord.status == "Absent")
        .group_by(AttendanceRecord.student_id)
        .subquery()
    )
    results = (
        db.query(
            Student.id,
            User.first_name,
            User.last_name,
            func.coalesce(grade_sub.c.avg_score, 0.0).label("avg"),
            func.coalesce(absence_sub.c.abs_count, 0).label("abs"),
        )
        .join(User, Student.user_id == User.id)
        .outerjoin(grade_sub, Student.id == grade_sub.c.student_id)
        .outerjoin(absence_sub, Student.id == absence_sub.c.student_id)
        .filter((grade_sub.c.avg_score < 10.0) | (absence_sub.c.abs_count > 3))
        .all()
    )
    at_risk = []
    for r in results:
        # Business logic for recommendations
        if r.avg < 10 and r.abs > 3:
            rec = "Urgent 1-on-1 meeting and academic probation warning."
        elif r.avg < 10:
            rec = "Enrolment in peer-tutoring sessions recommended."
        else:
            rec = "Send attendance notification to student and department head."

        at_risk.append(
            AtRiskStudent(
                student_id=r.id,
                first_name=r.first_name,
                last_name=r.last_name,
                average_grade=round(r.avg, 2),
                total_absences=r.abs,
                recommendation=rec,
            )
        )
    return at_risk

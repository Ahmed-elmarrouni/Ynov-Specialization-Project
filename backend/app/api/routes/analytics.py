from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# from sqlalchemy import func
from sqlalchemy import func, case
from pydantic import BaseModel
from app.core.database import get_db
from app.models.student import Student
from app.models.academic import Grade, AttendanceRecord, Cohort
from app.models.system import User

router = APIRouter()


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
    Hardened against DivisionByZero and Null results.
    """
    total_students = db.query(func.count(Student.id)).scalar() or 0

    overall_average_query = (
        db.query(func.avg(Grade.score)).filter(Grade.is_absent == False).scalar()
    )
    overall_average = (
        float(overall_average_query) if overall_average_query is not None else 0.0
    )

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

    pass_rate = 0.0
    if total_students > 0:
        pass_rate = (passing_students / total_students) * 100

    # Absence Rate
    total_att = db.query(func.count(AttendanceRecord.id)).scalar() or 0
    absences = (
        db.query(func.count(AttendanceRecord.id))
        .filter(AttendanceRecord.status == "Absent")
        .scalar()
        or 0
    )

    absence_rate = 0.0
    if total_att > 0:
        absence_rate = (absences / total_att) * 100

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
    Refactored to eliminate Cartesian Joins for perfect mathematical accuracy.
    """
    cohorts = db.query(Cohort).all()
    results = []

    for cohort in cohorts:
        # 1. Isolate the students in this specific cohort
        student_ids = [
            s.id
            for s in db.query(Student.id).filter(Student.cohort_id == cohort.id).all()
        ]

        if not student_ids:
            results.append(
                ClassComparison(
                    cohort_name=cohort.name, avg_grade=0.0, absence_rate=0.0
                )
            )
            continue

        # 2. Calculate true Average Grade
        avg_grade = (
            db.query(func.avg(Grade.score))
            .filter(Grade.student_id.in_(student_ids), Grade.is_absent == False)
            .scalar()
            or 0.0
        )

        # 3. Calculate true Absence Rate
        total_att = (
            db.query(func.count(AttendanceRecord.id))
            .filter(AttendanceRecord.student_id.in_(student_ids))
            .scalar()
            or 0
        )

        absences = (
            db.query(func.count(AttendanceRecord.id))
            .filter(
                AttendanceRecord.student_id.in_(student_ids),
                AttendanceRecord.status == "Absent",
            )
            .scalar()
            or 0
        )

        absence_rate = 0.0
        if total_att > 0:
            absence_rate = (absences / total_att) * 100

        # 4. Append clean, verified data
        results.append(
            ClassComparison(
                cohort_name=cohort.name,
                avg_grade=round(float(avg_grade), 2),
                absence_rate=round(absence_rate, 2),
            )
        )

    return results


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
        .filter((grade_sub.c.avg_score < 10.0) | (absence_sub.c.absence_count > 3))
        .all()
    )
    at_risk = []
    for r in results:
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


@router.get("/grade-distribution")
def get_grade_distribution(db: Session = Depends(get_db)):
    """
    Calculates the frequency distribution of grades (Histogram data).
    Groups grades by rounding down to the nearest integer.
    """
    distribution = (
        db.query(
            func.floor(Grade.score).label("score_bucket"),
            func.count(Grade.id).label("student_count"),
        )
        .filter(Grade.is_absent == False)
        .group_by(func.floor(Grade.score))
        .all()
    )

    dist_dict = {int(d.score_bucket): d.student_count for d in distribution}

    results = []
    for i in range(21):
        results.append({"score": str(i), "count": dist_dict.get(i, 0)})

    return results

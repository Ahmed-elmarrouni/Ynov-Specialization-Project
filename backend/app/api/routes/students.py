from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.models.student import Student
from app.models.system import User
from app.models.academic import Grade, AttendanceRecord, Cohort
from app.core import security

router = APIRouter()


class StudentSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    student_id_number: str
    cohort_name: Optional[str]
    enrollment_status: str
    overall_average: float
    total_absences: int

    class Config:
        from_attributes = True


class PaginatedStudents(BaseModel):
    total: int
    page: int
    size: int
    items: List[StudentSummary]


class StudentDetail(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    student_id_number: str
    birth_date: Optional[date]
    cohort_id: Optional[int]
    cohort_name: Optional[str]
    enrollment_status: str
    total_absences: int
    overall_average: float

    class Config:
        from_attributes = True



@router.get("/", response_model=PaginatedStudents)
def get_students(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    cohort_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user),
):
    """
    Returns a paginated list of students with search and filtering.
    Includes overall average and total absences for each student.
    """
    skip = (page - 1) * size

    query = (
        db.query(
            Student.id,
            User.first_name,
            User.last_name,
            User.email,
            Student.student_id_number,
            Cohort.name.label("cohort_name"),
            Student.enrollment_status,
        )
        .outerjoin(User, Student.user_id == User.id)
        .outerjoin(Cohort, Student.cohort_id == Cohort.id)
    )

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_filter),
                User.last_name.ilike(search_filter),
                User.email.ilike(search_filter),
                Student.student_id_number.ilike(search_filter),
            )
        )

    if cohort_id:
        query = query.filter(Student.cohort_id == cohort_id)

    if status:
        query = query.filter(Student.enrollment_status == status)

    total = query.count()

    results = query.offset(skip).limit(size).all()

    student_items = []
    for r in results:
        avg_grade = (
            db.query(func.avg(Grade.score))
            .filter(Grade.student_id == r.id, Grade.is_absent == False)
            .scalar()
            or 0.0
        )

        absences = (
            db.query(func.count(AttendanceRecord.id))
            .filter(
                AttendanceRecord.student_id == r.id, AttendanceRecord.status == "Absent"
            )
            .scalar()
            or 0
        )

        student_items.append(
            StudentSummary(
                id=r.id,
                first_name=r.first_name,
                last_name=r.last_name,
                email=r.email,
                student_id_number=r.student_id_number,
                cohort_name=r.cohort_name,
                enrollment_status=r.enrollment_status,
                overall_average=round(avg_grade, 2),
                total_absences=absences,
            )
        )

    return PaginatedStudents(total=total, page=page, size=size, items=student_items)


@router.get("/{student_id}", response_model=StudentDetail)
def get_student_detail(student_id: int, db: Session = Depends(get_db)):
    """
    Fetches comprehensive details for a specific student.
    """
    student_query = (
        db.query(
            Student.id,
            User.first_name,
            User.last_name,
            User.email,
            Student.student_id_number,
            Student.birth_date,
            Student.cohort_id,
            Cohort.name.label("cohort_name"),
            Student.enrollment_status,
        )
        .join(User, Student.user_id == User.id)
        .outerjoin(Cohort, Student.cohort_id == Cohort.id)
        .filter(Student.id == student_id)
        .first()
    )

    if not student_query:
        raise HTTPException(status_code=404, detail="Student not found")

    absences = (
        db.query(func.count(AttendanceRecord.id))
        .filter(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.status == "Absent",
        )
        .scalar()
        or 0
    )

    avg_grade = (
        db.query(func.avg(Grade.score))
        .filter(Grade.student_id == student_id, Grade.is_absent == False)
        .scalar()
        or 0.0
    )

    return StudentDetail(
        id=student_query.id,
        first_name=student_query.first_name,
        last_name=student_query.last_name,
        email=student_query.email,
        student_id_number=student_query.student_id_number,
        birth_date=student_query.birth_date,
        cohort_id=student_query.cohort_id,
        cohort_name=student_query.cohort_name,
        enrollment_status=student_query.enrollment_status,
        total_absences=absences,
        overall_average=round(avg_grade, 2),
    )

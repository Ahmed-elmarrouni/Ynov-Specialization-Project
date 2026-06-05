from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.models.student import Student
from app.models.system import User
from app.models.academic import Grade, AttendanceRecord

router = APIRouter()

#  Pydantic Schemas 

class StudentDetail(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    total_absences: int
    overall_average: float

    class Config:
        from_attributes = True

#  API Routes 

@router.get("/{student_id}", response_model=StudentDetail)
def get_student_detail(student_id: int, db: Session = Depends(get_db)):
    """
    Fetches comprehensive details for a specific student.
    Includes personal info, aggregate absences, and overall grade average.
    """
    # 1. Fetch Student and User base info
    student_query = db.query(
        Student.id,
        User.first_name,
        User.last_name,
        User.email
    ).join(User, Student.user_id == User.id)\
     .filter(Student.id == student_id)\
     .first()

    if not student_query:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. Calculate Total Absences
    absences = db.query(func.count(AttendanceRecord.id))\
        .filter(AttendanceRecord.student_id == student_id)\
        .filter(AttendanceRecord.status == "Absent")\
        .scalar() or 0

    # 3. Calculate Overall Average Grade
    avg_grade = db.query(func.avg(Grade.score))\
        .filter(Grade.student_id == student_id)\
        .filter(Grade.is_absent == False)\
        .scalar() or 0.0

    return StudentDetail(
        id=student_query.id,
        first_name=student_query.first_name,
        last_name=student_query.last_name,
        email=student_query.email,
        total_absences=absences,
        overall_average=round(avg_grade, 2)
    )

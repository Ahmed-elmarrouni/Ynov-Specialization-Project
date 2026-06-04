from sqlalchemy import Column, Integer, String, Date, Time, Float, Boolean, Text, DateTime, ForeignKey
from app.core.database import Base
import datetime

class AcademicYear(Base):
    __tablename__ = "academic_years"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    is_current = Column(Boolean, default=False)

class Program(Base):
    __tablename__ = "programs"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    department = Column(String)
    degree_level = Column(String)
    schedule_type = Column(String)

class Cohort(Base):
    __tablename__ = "cohorts"
    id = Column(Integer, primary_key=True)
    program_id = Column(Integer, ForeignKey("programs.id"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    name = Column(String)

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, index=True)
    name = Column(String)
    credits = Column(Integer)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.datetime.utcnow)

class CohortModule(Base):
    __tablename__ = "cohort_modules"
    id = Column(Integer, primary_key=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    cohort_id = Column(Integer, ForeignKey("cohorts.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    total_hours = Column(Integer)

class ScheduledSession(Base):
    __tablename__ = "scheduled_sessions"
    id = Column(Integer, primary_key=True)
    cohort_module_id = Column(Integer, ForeignKey("cohort_modules.id"))
    session_date = Column(Date)
    start_time = Column(Time)
    end_time = Column(Time)
    room = Column(String)
    type = Column(String)

class Evaluation(Base):
    __tablename__ = "evaluations"
    id = Column(Integer, primary_key=True)
    cohort_module_id = Column(Integer, ForeignKey("cohort_modules.id"))
    title = Column(String)
    type = Column(String)
    weight_percentage = Column(Float)
    max_score = Column(Float, default=20.0)
    evaluation_date = Column(Date)

class Grade(Base):
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    score = Column(Float)
    is_absent = Column(Boolean, default=False)
    comments = Column(Text)
    graded_at = Column(DateTime, default=datetime.datetime.utcnow)

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("scheduled_sessions.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    status = Column(String)
    minutes_late = Column(Integer, default=0)
    is_justified = Column(Boolean, default=False)
    justification_reason = Column(Text)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.models.system import User
from app.models.academic import Program, Cohort, Grade, AttendanceRecord, Evaluation, CohortModule

router = APIRouter()


class DashboardKPIs(BaseModel):
    students_count: int
    teachers_count: int
    admins_count: int
    pedagogical_managers_count: int
    total_cohorts: int
    school_wide_average: float

class RadarStat(BaseModel):
    program_name: str
    avg_grade: float
    pass_rate: float
    attendance_score: float

class ActivityTimelineEntry(BaseModel):
    date: str
    value: float

class RecentUser(BaseModel):
    first_name: str
    last_name: str
    email: str
    role: str
    created_at: datetime


@router.get("/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(db: Session = Depends(get_db)):
    """
    Returns exact counts of users by role and global academic metrics.
    """
    role_counts = db.query(
        User.role, 
        func.count(User.id).label("count")
    ).group_by(User.role).all()
    
    counts_dict = {role: count for role, count in role_counts}
    
    total_cohorts = db.query(func.count(Cohort.id)).scalar() or 0
    
    global_avg = db.query(func.avg(Grade.score)).filter(Grade.is_absent == False).scalar() or 0.0
    
    return DashboardKPIs(
        students_count=counts_dict.get("student", 0),
        teachers_count=counts_dict.get("teacher", 0),
        admins_count=counts_dict.get("admin", 0),
        pedagogical_managers_count=counts_dict.get("pedagogical_manager", 0),
        total_cohorts=total_cohorts,
        school_wide_average=round(float(global_avg), 2)
    )

@router.get("/radar-stats", response_model=List[RadarStat])
def get_radar_stats(db: Session = Depends(get_db)):
    """
    Calculates performance metrics per Program scaled to 20.
    """
    programs = db.query(Program).all()
    
    # 2. Avg Grades and Pass Rates per Program
    # Joining Program -> Cohort -> CohortModule -> Evaluation -> Grade
    perf_data = db.query(
        Program.id.label("program_id"),
        func.avg(Grade.score).label("avg_score"),
        func.coalesce(func.sum(case((Grade.score >= 10, 1), else_=0)), 0).label("pass_count"),
        func.count(Grade.id).label("total_grades")
    ).join(Cohort, Program.id == Cohort.program_id) \
     .join(CohortModule, Cohort.id == CohortModule.cohort_id) \
     .join(Evaluation, CohortModule.id == Evaluation.cohort_module_id) \
     .join(Grade, Evaluation.id == Grade.evaluation_id) \
     .filter(Grade.is_absent == False) \
     .group_by(Program.id).all()
    
    perf_map = {p.program_id: p for p in perf_data}
    
    # 3. Attendance per Program
    # Joining Program -> Cohort -> ScheduledSession -> AttendanceRecord
    # Assuming AttendanceRecord.status = 'PRESENT' or 'ABSENT'
    attendance_data = db.query(
        Program.id.label("program_id"),
        func.coalesce(func.sum(case((AttendanceRecord.status == "PRESENT", 1), else_=0)), 0).label("present_count"),
        func.count(AttendanceRecord.id).label("total_records")
    ).join(Cohort, Program.id == Cohort.program_id) \
     .join(CohortModule, Cohort.id == CohortModule.cohort_id) \
     .join(AttendanceRecord, CohortModule.id == AttendanceRecord.session_id) \
     .group_by(Program.id).all()
    
    # Note: AttendanceRecord schema check: session_id in my previous read was session_id FK to ScheduledSession
    # Let me double check academic.py's AttendanceRecord
    # class AttendanceRecord(Base):
    #    session_id = Column(Integer, ForeignKey("scheduled_sessions.id"))
    # So the join should be Program -> Cohort -> CohortModule -> ScheduledSession -> AttendanceRecord
    
    attendance_data_corrected = db.query(
        Program.id.label("program_id"),
        func.coalesce(func.sum(case((AttendanceRecord.status == "PRESENT", 1), else_=0)), 0).label("present_count"),
        func.count(AttendanceRecord.id).label("total_records")
    ).join(Cohort, Program.id == Cohort.program_id) \
     .join(CohortModule, Cohort.id == CohortModule.cohort_id) \
     .join(AttendanceRecord, CohortModule.id == AttendanceRecord.session_id, isouter=True) \
     .group_by(Program.id).all()
    # Actually wait, AttendanceRecord session_id points to scheduled_sessions.id in academic.py
    # Re-reading academic.py:
    # class ScheduledSession(Base): cohort_module_id = Column(...)
    # class AttendanceRecord(Base): session_id = Column(Integer, ForeignKey("scheduled_sessions.id"))
    
    # Let's fix the attendance query logic
    from app.models.academic import ScheduledSession
    attendance_data = db.query(
        Program.id.label("program_id"),
        func.coalesce(func.sum(case((AttendanceRecord.status == "PRESENT", 1), else_=0)), 0).label("present_count"),
        func.count(AttendanceRecord.id).label("total_records")
    ).join(Cohort, Program.id == Cohort.program_id) \
     .join(CohortModule, Cohort.id == CohortModule.cohort_id) \
     .join(ScheduledSession, CohortModule.id == ScheduledSession.cohort_module_id) \
     .join(AttendanceRecord, ScheduledSession.id == AttendanceRecord.session_id) \
     .group_by(Program.id).all()

    att_map = {a.program_id: a for a in attendance_data}
    
    results = []
    for p in programs:
        perf = perf_map.get(p.id)
        att = att_map.get(p.id)
        
        avg_score = round(float(perf.avg_score or 0.0), 2) if perf else 0.0
        
        pass_rate_val = 0.0
        if perf and perf.total_grades > 0:
            pass_rate_val = (perf.pass_count / perf.total_grades) * 20.0 # Scaled to 20
            
        att_score = 0.0
        if att and att.total_records > 0:
            att_score = (att.present_count / att.total_records) * 20.0 # Scaled to 20
            
        results.append(RadarStat(
            program_name=p.name,
            avg_grade=avg_score,
            pass_rate=round(pass_rate_val, 2),
            attendance_score=round(att_score, 2)
        ))
        
    return results


@router.get("/activity-timeline", response_model=List[ActivityTimelineEntry])
def get_activity_timeline(db: Session = Depends(get_db)):
    """
    Returns grade trends over the ENTIRE recorded period.
    """
    timeline = db.query(
        func.date(Grade.graded_at).label("day"),
        func.avg(Grade.score).label("avg_score")
    ).filter(Grade.is_absent == False) \
     .group_by(func.date(Grade.graded_at)) \
     .order_by(func.date(Grade.graded_at)).all()
     
    return [
        ActivityTimelineEntry(
            date=str(t.day),
            value=round(float(t.avg_score or 0.0), 2)
        ) for t in timeline
    ]

from typing import List, Dict, Any, Optional

@router.get("/recent-users", response_model=List[RecentUser])
def get_recent_users(
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    role: Optional[str] = None
):
    """
    Returns 50 most recent users with optional search and role filtering.
    """
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.email.ilike(search_filter))
        )
        
    users = query.order_by(desc(User.created_at)).limit(50).all()
    return users

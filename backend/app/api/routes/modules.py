from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from pydantic import BaseModel

from app.core.database import get_db
from app.models.academic import Module, CohortModule, Evaluation, Grade, Cohort

router = APIRouter()


class ModuleStats(BaseModel):
    id: int
    code: str
    name: str
    credits: int
    overall_average: float
    pass_rate: float
    total_evaluations: int

class EvaluationTypeStats(BaseModel):
    type: str
    average_score: float
    highest_score: float
    lowest_score: float

class CohortBreakdown(BaseModel):
    cohort_name: str
    average_grade: float
    pass_rate: float


@router.get("/", response_model=List[ModuleStats])
def get_module_master_matrix(db: Session = Depends(get_db)):
    """
    Returns the Module Master Matrix with deep statistical insights.
    Optimized to avoid Cartesian Product memory traps.
    """
    modules = db.query(Module).all()
    
    stats_query = (
        db.query(
            Module.id.label("module_id"),
            func.avg(Grade.score).label("avg_score"),
            func.count(func.distinct(Evaluation.id)).label("eval_count"),
            func.coalesce(func.sum(case((Grade.score >= 10, 1), else_=0)), 0).label("pass_count"),
            func.count(Grade.id).label("total_grades")
        )
        .join(CohortModule, Module.id == CohortModule.module_id)
        .join(Evaluation, CohortModule.id == Evaluation.cohort_module_id)
        .outerjoin(Grade, Evaluation.id == Grade.evaluation_id)
        .filter(case((Grade.is_absent == True, False), else_=True)) 
        .group_by(Module.id)
    ).all()

    stats_map = {s.module_id: s for s in stats_query}

    results = []
    for m in modules:
        stats = stats_map.get(m.id)
        
        avg_score = 0.0
        pass_rate = 0.0
        eval_count = 0
        
        if stats:
            avg_score = round(stats.avg_score or 0.0, 2)
            eval_count = stats.eval_count
            if stats.total_grades > 0:
                pass_rate = round((stats.pass_count / stats.total_grades) * 100, 2)

        results.append(ModuleStats(
            id=m.id,
            code=m.code,
            name=m.name,
            credits=m.credits,
            overall_average=avg_score,
            pass_rate=pass_rate,
            total_evaluations=eval_count
        ))

    return results

@router.get("/evaluations-stats", response_model=List[EvaluationTypeStats])
def get_evaluations_performance(db: Session = Depends(get_db)):
    """
    Group performance by Evaluation.type.
    """
    results = (
        db.query(
            Evaluation.type.label("type"),
            func.avg(Grade.score).label("avg_score"),
            func.max(Grade.score).label("max_score"),
            func.min(Grade.score).label("min_score")
        )
        .join(Grade, Evaluation.id == Grade.evaluation_id)
        .filter(Grade.is_absent == False)
        .group_by(Evaluation.type)
        .all()
    )

    return [
        EvaluationTypeStats(
            type=r.type or "Unknown",
            average_score=round(r.avg_score or 0.0, 2),
            highest_score=round(r.max_score or 0.0, 2),
            lowest_score=round(r.min_score or 0.0, 2)
        )
        for r in results
    ]

@router.get("/{module_id}/cohort-breakdown", response_model=List[CohortBreakdown])
def get_module_cohort_breakdown(module_id: int, db: Session = Depends(get_db)):
    """
    Returns average grade and pass rate per cohort for a specific module.
    """
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    results = (
        db.query(
            Cohort.name.label("cohort_name"),
            func.avg(Grade.score).label("avg_score"),
            func.coalesce(func.sum(case((Grade.score >= 10, 1), else_=0)), 0).label("pass_count"),
            func.count(Grade.id).label("total_grades")
        )
        .join(CohortModule, Cohort.id == CohortModule.cohort_id)
        .join(Evaluation, CohortModule.id == Evaluation.cohort_module_id)
        .join(Grade, Evaluation.id == Grade.evaluation_id)
        .filter(CohortModule.module_id == module_id)
        .filter(Grade.is_absent == False)
        .group_by(Cohort.name)
        .all()
    )

    breakdown = []
    for r in results:
        pass_rate = 0.0
        if r.total_grades > 0:
            pass_rate = round((r.pass_count / r.total_grades) * 100, 2)
        
        breakdown.append(CohortBreakdown(
            cohort_name=r.cohort_name,
            average_grade=round(r.avg_score or 0.0, 2),
            pass_rate=pass_rate
        ))

    return breakdown

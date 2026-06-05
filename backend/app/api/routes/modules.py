from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.database import get_db
from app.models.academic import Module, CohortModule, Evaluation, Grade

router = APIRouter()

#  Pydantic Schemas


class ModulePerformance(BaseModel):
    module_name: str
    average_score: float

    class Config:
        from_attributes = True


#  API Routes


@router.get("/performance", response_model=List[ModulePerformance])
def get_modules_performance(db: Session = Depends(get_db)):
    """
    Calculates the average grade for each module across all cohorts.
    Used to identify difficult subjects.
    """
    results = (
        db.query(
            Module.name.label("module_name"),
            func.avg(Grade.score).label("average_score"),
        )
        .join(CohortModule, Module.id == CohortModule.module_id)
        .join(Evaluation, CohortModule.id == Evaluation.cohort_module_id)
        .join(Grade, Evaluation.id == Grade.evaluation_id)
        .filter(Grade.is_absent == False)
        .group_by(Module.name)
        .all()
    )

    return [
        ModulePerformance(
            module_name=r.module_name, average_score=round(r.average_score, 2)
        )
        for r in results
    ]

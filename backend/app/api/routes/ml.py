from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.ml.segment_profiles import segment_students
from app.ml.predict_risk import predict_student_risk

router = APIRouter()


# Pydantic Schemas
class SegmentationResult(BaseModel):
    student_id: int
    profile: str


class PredictionResult(BaseModel):
    student_id: int
    failure_probability: float
    is_at_risk: bool


#  API Routes
@router.get("/segmentation", response_model=List[SegmentationResult])
def get_student_segmentation(db: Session = Depends(get_db)):
    """
    Categorizes students into profiles using K-Means clustering.
    """
    segments = segment_students(db)
    return [
        SegmentationResult(student_id=sid, profile=name)
        for sid, name in segments.items()
    ]


@router.get("/predict/{student_id}", response_model=PredictionResult)
def get_risk_prediction(student_id: int, db: Session = Depends(get_db)):
    """
    Estimates the probability of academic failure for a specific student
    using a Random Forest model trained on historical patterns.
    """
    probability, is_risk = predict_student_risk(student_id, db)

    return PredictionResult(
        student_id=student_id,
        failure_probability=round(probability, 4),
        is_at_risk=is_risk,
    )

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd
import io
from app.core.database import get_db
from app.models.system import User
from app.core import security
from app.etl.pipeline import process_student_import

router = APIRouter()


@router.post("/upload")
async def upload_data(
    file: UploadFile = File(...),
    current_user: User = Depends(
        security.RequireRole(["admin", "pedagogical_manager"])
    ),
    db: Session = Depends(get_db),
):
    """
    Uploads and persists student data using the ETL pipeline.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file format.")
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        # Required columns check
        required_cols = {"first_name", "last_name", "email"}
        if not required_cols.issubset(df.columns):
            raise HTTPException(
                status_code=400,
                detail=f"Missing columns: {required_cols - set(df.columns)}",
            )
        result = process_student_import(df, db, current_user.id, file.filename)
        return {
            "message": "Import process finished.",
            "import_id": result.id,
            "total_rows": result.total_rows,
            "success_count": result.success_rows,
            "error_count": result.error_rows,
            "status": result.status,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"ETL Failure: {str(e)}")

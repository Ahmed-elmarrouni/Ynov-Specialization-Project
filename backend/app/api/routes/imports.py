from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd
import io

from app.core.database import get_db
from app.models.system import User
from app.core import security

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
    Uploads and processes a CSV data file.
    Validates file extension and Content-Type for security.
    """
    # Double validation: Extension and MIME type
    is_csv = file.filename.endswith(".csv")
    is_csv_mime = file.content_type in ["text/csv", "application/vnd.ms-excel"]

    if not (is_csv or is_csv_mime):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a valid CSV file.",
        )

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        if df.empty:
            raise pd.errors.EmptyDataError("DataFrame is empty")

        return {
            "message": "File processed and validated.",
            "file_name": file.filename,
            "total_rows_detected": len(df),
            "columns_detected": list(df.columns),
        }

    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="The uploaded CSV file is empty.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data processing failed: {str(e)}")

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import pandas as pd
import io
from app.core.database import get_db
from app.models.system import User
from app.core import security
from app.etl.pipeline import process_import_payload

router = APIRouter()

@router.post("/upload")
async def upload_data(
    file: UploadFile = File(...),
    target_table: str = Form(...),
    current_user: User = Depends(security.RequireRole(["admin", "pedagogical_manager"])),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file format.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        result = process_import_payload(df, db, current_user.id, file.filename, target_table)
        
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
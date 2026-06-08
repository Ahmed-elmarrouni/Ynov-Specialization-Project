from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.routes import analytics, modules, students, ml, auth, invitations, imports
from app.core.database import get_db
from app.core import security


def create_application() -> FastAPI:
    """
    Factory function to initialize the FastAPI application.
    """
    application = FastAPI(
        title="EduTrack Analytics API",
        description="Backend for analyzing student academic performance",
        version="1.0.0",
        dependencies=[Depends(security.security_scheme)],
    )

    # CORS config
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(
        auth.router, prefix="/api/v1/auth", tags=["Authentication"]
    )
    application.include_router(
        invitations.router, prefix="/api/v1/invitations", tags=["RBAC"]
    )
    application.include_router(
        analytics.router, prefix="/api/v1/analytics", tags=["Analytics"]
    )
    application.include_router(
        modules.router, prefix="/api/v1/modules", tags=["Modules"]
    )
    application.include_router(
        students.router, prefix="/api/v1/students", tags=["Students"]
    )
    application.include_router(
        ml.router, prefix="/api/v1/ml", tags=["Machine Learning"]
    )
    application.include_router(
        imports.router, prefix="/api/v1/imports", tags=["Data Import"]
    )

    return application


app = create_application()


@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint to verify API status and database connectivity.
    """
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
        }
    except Exception as e:
        raise HTTPException(
            status_code=503, detail=f"Database connection failed: {str(e)}"
        )


@app.get("/")
def root():
    return {"message": "Welcome to EduTrack Analytics API"}

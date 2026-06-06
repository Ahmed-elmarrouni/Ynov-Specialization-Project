from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.models.system import User
from app.core import security
from app.services.email import EmailService

router = APIRouter()

class InviteRequest(BaseModel):
    email: EmailStr
    role: str

class CompleteProfileRequest(BaseModel):
    token: str
    first_name: str
    last_name: str
    password: str

@router.post("/invite")
def invite_user(
    request: InviteRequest, 
    current_user: User = Depends(security.RequireRole(["admin", "pedagogical_manager"])),
    db: Session = Depends(get_db)
):
    if current_user.role == "pedagogical_manager" and request.role not in ["teacher", "student"]:
        raise HTTPException(status_code=403, detail="Managers can only invite Teachers or Students")
    
    token = security.create_access_token(data={"email": request.email, "role": request.role})
    EmailService.send_invitation(request.email, token, request.role)
    return {"message": f"Invitation sent to {request.email}"}

@router.post("/complete-profile")
def complete_profile(request: CompleteProfileRequest, db: Session = Depends(get_db)):
    payload = security.decode_token(request.token)
    email = payload.get("email")
    role = payload.get("role")
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
         raise HTTPException(status_code=400, detail="Account already active")

    new_user = User(
        email=email,
        role=role,
        first_name=request.first_name,
        last_name=request.last_name,
        password_hash=security.hash_password(request.password)
    )
    db.add(new_user)
    db.commit()
    return {"message": "Account activated successfully"}

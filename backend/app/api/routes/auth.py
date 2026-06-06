from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.models.system import User
from app.core import security
from app.services.email import EmailService
from datetime import datetime, timedelta

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Verify2FARequest(BaseModel):
    email: EmailStr
    code: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not security.verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    code = security.generate_verification_code()
    # In a full implementation, save code to DB with expiry
    EmailService.send_2fa_code(user.email, code)
    
    return {"message": "2FA code sent to email"}

@router.post("/verify-2fa")
def verify_2fa(request: Verify2FARequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Logic to check code from DB/Redis would go here
    
    access_token = security.create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        reset_token = security.create_access_token(
            data={"sub": str(user.id), "scope": "password_reset"}, 
            expires_delta=timedelta(minutes=15)
        )
    return {"message": "If the email exists, a reset link has been sent"}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = security.decode_token(request.token)
    if payload.get("scope") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid token scope")
    
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    user.password_hash = security.hash_password(request.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

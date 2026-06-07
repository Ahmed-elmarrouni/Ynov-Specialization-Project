from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.models.system import User
from app.core import security
from app.services.email import EmailService

router = APIRouter()

# --- Schemas ---

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    requires_2fa: bool
    message: str

class Verify2FARequest(BaseModel):
    email: EmailStr
    code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

# --- Routes ---

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Initial login attempt. Detects if 2FA is needed and responds accordingly.
    """
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not security.verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if user.is_2fa_enabled:
        # Simulate code generation and storage
        # In production, use Redis or a specific DB table for these codes
        dummy_code = "123456"
        EmailService.send_2fa_code(user.email, dummy_code)
        
        return LoginResponse(
            requires_2fa=True,
            message="A verification code has been sent to your email."
        )
    
    # Return JWT immediately if 2FA is disabled
    access_token = security.create_access_token(data={"sub": str(user.id), "role": user.role})
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        requires_2fa=False,
        message="Login successful."
    )

@router.post("/verify-2fa", response_model=TokenResponse)
def verify_2fa(request: Verify2FARequest, db: Session = Depends(get_db)):
    """
    Validates the 2FA code and issues the final access token.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Mock verification logic
    if request.code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    access_token = security.create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )

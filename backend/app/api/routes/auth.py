from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.system import User
from app.core import security
from app.services.email import EmailService

router = APIRouter()


# --- Pydantic Schemas ---
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


class Toggle2FARequest(BaseModel):
    enabled: bool


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# --- API Routes ---
@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not security.verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    if user.is_2fa_enabled:
        security_code = security.generate_2fa_code()
        user.two_factor_code = security_code
        user.two_factor_expires = datetime.utcnow() + timedelta(minutes=10)
        db.commit()

        EmailService.send_2fa_code(user.email, security_code)

        return LoginResponse(
            requires_2fa=True,
            message="A verification code has been sent to your email.",
        )

    access_token = security.create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        requires_2fa=False,
        message="Login successful.",
    )


@router.post("/verify-2fa", response_model=TokenResponse)
def verify_2fa(request: Verify2FARequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if not user.two_factor_code or user.two_factor_code != request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    if not user.two_factor_expires or user.two_factor_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired",
        )

    # Clear the 2FA fields upon successful verification
    user.two_factor_code = None
    user.two_factor_expires = None
    db.commit()

    access_token = security.create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.post("/toggle-2fa")
def toggle_2fa(
    request: Toggle2FARequest,
    current_user: User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    user.is_2fa_enabled = request.enabled
    db.commit()
    return {
        "message": f"2FA {'enabled' if request.enabled else 'disabled'} successfully"
    }


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        reset_token = security.create_access_token(
            data={"sub": str(user.id), "scope": "password_reset"},
            expires_delta=timedelta(minutes=15),
        )
    return {
        "message": "If the account exists, a reset link has been sent to the email."
    }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = security.decode_token(request.token)
    if payload.get("scope") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token scope"
        )

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user.password_hash = security.hash_password(request.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

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
    email: EmailStr
    code: str
    new_password: str


# --- Routes ---
@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Initial login attempt. Detects if 2FA is needed and responds accordingly.
    """
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not security.verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

        # --- for debugging ---
    print(f"DEBUG: Attempting login for: {user.email}")
    print(f"DEBUG: Hash in DB: {user.password_hash}")
    is_valid = security.verify_password(request.password, user.password_hash)
    print(f"DEBUG: Password verification result: {is_valid}")

    if user.is_2fa_enabled:
        code = security.generate_2fa_code()
        user.verification_code = code
        user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)
        db.commit()

        EmailService.send_2fa_code(user.email, code)

        return LoginResponse(
            requires_2fa=True,
            message="A verification code has been sent to your email.",
        )

    # access_token = security.create_access_token(
    #     data={"sub": str(user.id), "role": user.role}
    # )

    access_token = security.create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        requires_2fa=False,
        message="Login successful.",
    )


@router.post("/verify-2fa", response_model=TokenResponse)
def verify_2fa(request: Verify2FARequest, db: Session = Depends(get_db)):
    """
    Validates the 2FA code and issues the final access token.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if not user.verification_code or user.verification_code != request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code"
        )

    if datetime.utcnow() > user.verification_code_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired"
        )

    user.verification_code = None
    db.commit()

    access_token = security.create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }
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
        code = security.generate_verification_code()
        user.verification_code = code
        user.verification_code_expires = datetime.utcnow() + timedelta(minutes=15)
        db.commit()

        EmailService.send_email(
            subject="EduTrack - Password Reset Code",
            recipient=user.email,
            body=f"Your code to reset your password is: <b>{code}</b>. If you did not request this, please ignore this email.",
        )
    return {
        "message": "If the account exists, a reset code has been sent to the email."
    }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or user.verification_code != request.code:
        raise HTTPException(status_code=400, detail="Invalid code or email")

    if datetime.utcnow() > user.verification_code_expires:
        raise HTTPException(status_code=400, detail="Code expired")

    user.password_hash = security.hash_password(request.new_password)
    user.verification_code = None
    db.commit()
    return {"message": "Password updated successfully."}

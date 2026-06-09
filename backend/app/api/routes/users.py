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


class UserProfile(BaseModel):
    id: int
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    phone_number: Optional[str]
    role: str
    is_2fa_enabled: bool

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    phone_number: Optional[str]


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    two_factor_code: str


class DeleteAccountRequest(BaseModel):
    password: str


@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(security.get_current_user)):
    return current_user


@router.put("/me", response_model=UserProfile)
def update_me(
    request: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user),
):
    current_user.first_name = request.first_name or current_user.first_name
    current_user.last_name = request.last_name or current_user.last_name
    current_user.phone_number = request.phone_number or current_user.phone_number
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/send-password-2fa")
def send_password_2fa(
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user),
):
    code = security.generate_verification_code()
    current_user.verification_code = code
    current_user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    EmailService.send_email(
        subject="EduTrack - Password Change Verification",
        recipient=current_user.email,
        body=f"Your security code to change your password is: <b>{code}</b>. It expires in 10 minutes.",
    )
    return {"message": "Verification code sent to email"}


@router.post("/me/change-password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user),
):
    # Verify 2FA Code
    if (
        not current_user.verification_code
        or current_user.verification_code != request.two_factor_code
    ):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    if datetime.utcnow() > current_user.verification_code_expires:
        raise HTTPException(status_code=400, detail="Verification code expired")

    if not security.verify_password(
        request.current_password, current_user.password_hash
    ):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.password_hash = security.hash_password(request.new_password)
    current_user.verification_code = None
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/me")
def delete_account(
    request: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user),
):
    if not security.verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=400, detail="Incorrect password. Deletion cancelled."
        )

    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}

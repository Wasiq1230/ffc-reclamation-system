from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "viewer"
    p_number: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool = True
    is_phone_verified: bool = False
    is_email_verified: bool = False
    account_status: str = "active"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    p_number: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    account_status: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class LoginRequest(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    identifier: Optional[str] = None  # Single input accepting username, phone, or email
    password: str

class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., min_length=7, max_length=25)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: Optional[str] = None
    terms_accepted: bool = True

class PhoneOTPVerifyRequest(BaseModel):
    phone_number: str
    otp_code: str = Field(..., min_length=4, max_length=8)

class EmailVerifyRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    identifier: str
    channel: str = "phone"  # "phone" or "email"

class ForgotPasswordRequest(BaseModel):
    identifier: str  # Phone number or email

class ResetPasswordWithOTPRequest(BaseModel):
    phone_number: str
    otp_code: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

class ResetPasswordWithTokenRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    p_number: Optional[str] = None

class UserStatusUpdate(BaseModel):
    account_status: Optional[str] = None  # active, pending_approval, suspended, deactivated
    role: Optional[str] = None  # admin, fab_shop, technician, inspector, viewer
    is_active: Optional[bool] = None

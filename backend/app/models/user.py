from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    p_number = Column(String(50), nullable=True)  # Personnel Number (P.No.)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="viewer")  # admin, fab_shop, technician, inspector, viewer
    is_active = Column(Boolean, default=True, nullable=False)

    # Phone Authentication & E.164
    phone_number = Column(String(30), unique=True, index=True, nullable=True)
    is_phone_verified = Column(Boolean, default=False, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    account_status = Column(String(30), default="active", nullable=False)  # active, pending_approval, suspended, deactivated

    # Email Verification Challenge
    email_verification_token = Column(String(255), nullable=True)
    email_verification_expires_at = Column(DateTime, nullable=True)

    # Phone OTP Verification Challenge
    phone_otp_code = Column(String(10), nullable=True)
    phone_otp_expires_at = Column(DateTime, nullable=True)
    phone_otp_attempts = Column(Integer, default=0, nullable=False)

    # Password Recovery
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
    password_reset_otp = Column(String(10), nullable=True)
    password_reset_otp_expires_at = Column(DateTime, nullable=True)

    # Security Lockout & Abuse Prevention
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    created_jobs = relationship("ReclamationJob", back_populates="creator", foreign_keys="ReclamationJob.created_by_id")
    assigned_jobs = relationship("ReclamationJob", back_populates="assigned_technician", foreign_keys="ReclamationJob.assigned_technician_id")
    status_changes = relationship("StatusHistory", back_populates="user")

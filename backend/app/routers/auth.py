import re
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserOut,
    Token,
    LoginRequest,
    UserRegisterRequest,
    PhoneOTPVerifyRequest,
    EmailVerifyRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordWithOTPRequest,
    ResetPasswordWithTokenRequest,
    ChangePasswordRequest,
    UserProfileUpdate,
    UserStatusUpdate
)
from backend.app.services.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_roles,
    normalize_phone_number,
    validate_password_strength,
    generate_secure_otp,
    generate_secure_token,
    check_account_lockout
)
from backend.app.services.audit_service import record_audit_log

router = APIRouter(prefix="/auth", tags=["Authentication & Users"])

# ----------------- User Registration & Verification -----------------

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Professional employee registration with email, mobile phone number, and password policy."""
    # 1. Validate password match and complexity
    if req.confirm_password is not None and req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")

    try:
        validate_password_strength(req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Normalize and validate email & phone
    clean_email = req.email.lower().strip()
    try:
        clean_phone = normalize_phone_number(req.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Check uniqueness
    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    if db.query(User).filter(User.phone_number == clean_phone).first():
        raise HTTPException(status_code=400, detail="An account with this phone number already exists.")

    # 4. Generate unique username from email
    base_username = re.sub(r"[^a-zA-Z0-9_]", "", clean_email.split("@")[0])[:30]
    username_candidate = base_username
    counter = 1
    while db.query(User).filter(User.username == username_candidate).first():
        username_candidate = f"{base_username[:25]}_{counter}"
        counter += 1

    # 5. Generate secure verification challenges
    otp_code = generate_secure_otp(6)
    otp_expiry = datetime.utcnow() + timedelta(minutes=15)

    email_token = generate_secure_token(32)
    email_expiry = datetime.utcnow() + timedelta(hours=24)

    initial_status = "active"

    new_user = User(
        username=username_candidate,
        email=clean_email,
        full_name=req.full_name.strip(),
        phone_number=clean_phone,
        hashed_password=get_password_hash(req.password),
        role="viewer",
        is_active=True,
        is_phone_verified=False,
        is_email_verified=False,
        account_status=initial_status,
        phone_otp_code=otp_code,
        phone_otp_expires_at=otp_expiry,
        phone_otp_attempts=0,
        email_verification_token=email_token,
        email_verification_expires_at=email_expiry,
        failed_login_attempts=0
    )

    db.add(new_user)
    db.flush()

    record_audit_log(
        db, new_user, "REGISTER", "User", str(new_user.id),
        {"username": new_user.username, "phone": clean_phone, "status": initial_status}
    )
    db.commit()
    db.refresh(new_user)

    response_data = {
        "success": True,
        "message": "Registration successful. You may now sign in.",
        "user_id": new_user.id,
        "username": new_user.username,
        "phone_number": new_user.phone_number,
        "requires_approval": False,
    }

    # In development/test mode, expose the OTP code for automated validation
    if settings.APP_ENV != "production":
        response_data["demo_otp"] = otp_code

    return response_data

@router.post("/verify-phone-otp", response_model=dict)
def verify_phone_otp(req: PhoneOTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify single-use phone OTP within expiry window."""
    try:
        clean_phone = normalize_phone_number(req.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = db.query(User).filter(User.phone_number == clean_phone).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid phone number or verification code.")

    if user.is_phone_verified:
        return {"success": True, "message": "Phone number is already verified."}

    if user.phone_otp_attempts >= 5:
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Please request a new verification code.")

    if not user.phone_otp_code or not user.phone_otp_expires_at:
        raise HTTPException(status_code=400, detail="No active verification code found. Please request a new code.")

    if datetime.utcnow() > user.phone_otp_expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    user.phone_otp_attempts += 1

    if req.otp_code.strip() != user.phone_otp_code:
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    # Success: Invalidate OTP and mark verified
    user.is_phone_verified = True
    user.phone_otp_code = None
    user.phone_otp_expires_at = None
    user.phone_otp_attempts = 0
    db.commit()

    return {"success": True, "message": "Mobile phone number successfully verified."}

@router.post("/verify-email", response_model=dict)
def verify_email(req: EmailVerifyRequest, db: Session = Depends(get_db)):
    """Verify single-use cryptographic email token."""
    user = db.query(User).filter(User.email_verification_token == req.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or already used verification link.")

    if user.email_verification_expires_at and datetime.utcnow() > user.email_verification_expires_at:
        raise HTTPException(status_code=400, detail="Verification link has expired. Please request a new verification email.")

    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    db.commit()

    return {"success": True, "message": "Email address successfully verified."}

@router.post("/resend-verification", response_model=dict)
def resend_verification(req: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Resend phone OTP or email verification link."""
    identifier = req.identifier.strip()
    user = None

    # Check if identifier is phone or email
    if "@" in identifier:
        user = db.query(User).filter(User.email == identifier.lower()).first()
    else:
        try:
            norm_phone = normalize_phone_number(identifier)
            user = db.query(User).filter(User.phone_number == norm_phone).first()
        except Exception:
            user = db.query(User).filter((User.username == identifier) | (User.email == identifier.lower())).first()

    # Generic return to prevent user enumeration
    resp = {"success": True, "message": "If an eligible unverified account was found, a new verification code has been dispatched."}

    if not user:
        return resp

    if req.channel == "phone":
        new_otp = generate_secure_otp(6)
        user.phone_otp_code = new_otp
        user.phone_otp_expires_at = datetime.utcnow() + timedelta(minutes=15)
        user.phone_otp_attempts = 0
        db.commit()
        if settings.APP_ENV != "production":
            resp["demo_otp"] = new_otp
    else:
        new_token = generate_secure_token(32)
        user.email_verification_token = new_token
        user.email_verification_expires_at = datetime.utcnow() + timedelta(hours=24)
        db.commit()

    return resp

# ----------------- Login & Session Management -----------------

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate employee using Phone Number + Password, Username, or Email."""
    identifier = (request.phone_number or request.username or request.identifier or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Username, email, or mobile phone number is required.")

    user = None

    # 1. Try phone number lookup
    try:
        norm_phone = normalize_phone_number(identifier)
        user = db.query(User).filter(User.phone_number == norm_phone).first()
    except Exception:
        pass

    # 2. Try username or email lookup if phone didn't match
    if not user:
        user = db.query(User).filter(
            (User.username == identifier) | (User.email == identifier.lower())
        ).first()

    # 3. If user exists, enforce lockout protection
    if user:
        check_account_lockout(user)

    # 4. Verify password securely
    if not user or not verify_password(request.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(minutes=settings.LOCKOUT_MINUTES)
            db.commit()

        # Generic error message to prevent account enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, phone number, or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 5. Check account status & employee authorization
    if not user.is_active or user.account_status in ["suspended", "deactivated"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended or deactivated. Please contact your FFC administrator."
        )

    # If account was marked pending_approval, activate immediately
    if user.account_status == "pending_approval":
        user.account_status = "active"
        db.commit()

    # 6. Reset failed login counters upon successful authentication
    user.failed_login_attempts = 0
    user.locked_until = None

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    record_audit_log(db, user, "LOGIN", "User", str(user.id), {"username": user.username, "phone": user.phone_number})
    db.commit()

    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/oauth-login", response_model=Token)
def oauth_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 password standard compatibility endpoint."""
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username.lower())
    ).first()

    if user:
        check_account_lockout(user)

    if not user or not verify_password(form_data.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(minutes=settings.LOCKOUT_MINUTES)
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials.")

    if not user.is_active or user.account_status in ["suspended", "deactivated"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated or suspended.")

    if user.account_status == "pending_approval":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is pending administrator approval.")

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

# ----------------- Forgot Password & Recovery -----------------

@router.post("/forgot-password", response_model=dict)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset via registered mobile phone OTP or email."""
    identifier = req.identifier.strip()
    user = None

    if "@" in identifier:
        user = db.query(User).filter(User.email == identifier.lower()).first()
    else:
        try:
            norm_phone = normalize_phone_number(identifier)
            user = db.query(User).filter(User.phone_number == norm_phone).first()
        except Exception:
            user = db.query(User).filter((User.username == identifier) | (User.email == identifier.lower())).first()

    # Generic response: NEVER reveal whether an account exists (prevents account enumeration)
    resp = {
        "success": True,
        "message": "If an eligible account matches the information provided, recovery instructions have been sent."
    }

    if not user or not user.is_active:
        return resp

    # Generate single-use reset OTP and token with 15-minute expiry
    reset_otp = generate_secure_otp(6)
    reset_token = generate_secure_token(32)
    expiry = datetime.utcnow() + timedelta(minutes=15)

    user.password_reset_otp = reset_otp
    user.password_reset_token = reset_token
    user.password_reset_otp_expires_at = expiry
    user.password_reset_expires_at = expiry

    record_audit_log(db, user, "FORGOT_PASSWORD_REQUEST", "User", str(user.id), {"phone": user.phone_number})
    db.commit()

    if settings.APP_ENV != "production":
        resp["demo_otp"] = reset_otp
        resp["demo_token"] = reset_token

    return resp

@router.post("/reset-password", response_model=dict)
def reset_password(req: ResetPasswordWithOTPRequest, db: Session = Depends(get_db)):
    """Reset password using verified single-use OTP."""
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")

    try:
        validate_password_strength(req.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        clean_phone = normalize_phone_number(req.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = db.query(User).filter(User.phone_number == clean_phone).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification code or phone number.")

    if not user.password_reset_otp or not user.password_reset_otp_expires_at:
        raise HTTPException(status_code=400, detail="No active password reset request found.")

    if datetime.utcnow() > user.password_reset_otp_expires_at:
        raise HTTPException(status_code=400, detail="Password reset code has expired. Please request a new code.")

    if req.otp_code.strip() != user.password_reset_otp:
        raise HTTPException(status_code=400, detail="Invalid password reset code.")

    # Apply new password
    user.hashed_password = get_password_hash(req.new_password)
    user.password_reset_otp = None
    user.password_reset_token = None
    user.password_reset_otp_expires_at = None
    user.password_reset_expires_at = None
    user.failed_login_attempts = 0
    user.locked_until = None

    record_audit_log(db, user, "PASSWORD_RESET_SUCCESS", "User", str(user.id))
    db.commit()

    return {"success": True, "message": "Password has been successfully reset. You can now log in with your new password."}

@router.post("/reset-password-token", response_model=dict)
def reset_password_with_token(req: ResetPasswordWithTokenRequest, db: Session = Depends(get_db)):
    """Reset password using cryptographic reset token."""
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")

    try:
        validate_password_strength(req.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = db.query(User).filter(User.password_reset_token == req.token).first()
    if not user or not user.password_reset_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset link.")

    if datetime.utcnow() > user.password_reset_expires_at:
        raise HTTPException(status_code=400, detail="Password reset link has expired. Please request a new link.")

    user.hashed_password = get_password_hash(req.new_password)
    user.password_reset_token = None
    user.password_reset_otp = None
    user.password_reset_expires_at = None
    user.password_reset_otp_expires_at = None
    user.failed_login_attempts = 0
    user.locked_until = None

    record_audit_log(db, user, "PASSWORD_RESET_SUCCESS", "User", str(user.id))
    db.commit()

    return {"success": True, "message": "Password has been successfully reset."}

@router.post("/change-password", response_model=dict)
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Authenticated user password change requiring current password verification."""
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")

    if verify_password(req.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="New password cannot be identical to your current password.")

    try:
        validate_password_strength(req.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    current_user.hashed_password = get_password_hash(req.new_password)
    record_audit_log(db, current_user, "PASSWORD_CHANGE", "User", str(current_user.id))
    db.commit()

    return {"success": True, "message": "Password changed successfully."}

# ----------------- Profile & User Management -----------------

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Return authenticated employee profile."""
    return current_user

@router.put("/me", response_model=UserOut)
def update_my_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update employee self-profile without privilege escalation."""
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip()
    if profile_in.p_number is not None:
        current_user.p_number = profile_in.p_number.strip()

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/users", response_model=List[UserOut])
def list_users(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List system users (accessible to authenticated staff; admins see all statuses)."""
    query = db.query(User)
    if current_user.role != "admin":
        query = query.filter(User.is_active == True, User.account_status == "active")
    elif status:
        query = query.filter(User.account_status == status)

    return query.order_by(User.full_name).all()

@router.put("/users/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Admin-only endpoint to approve pending accounts, adjust roles, or suspend/deactivate accounts."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User account not found.")

    # Prevent admin from deactivating themselves
    if target_user.id == current_user.id:
        if status_in.is_active is False or (status_in.account_status and status_in.account_status != "active"):
            raise HTTPException(status_code=400, detail="Administrators cannot deactivate or suspend their own account.")
        if status_in.role and status_in.role != "admin":
            raise HTTPException(status_code=400, detail="Administrators cannot demote their own administrative role.")

    changes = {}
    if status_in.account_status is not None:
        valid_statuses = ["active", "pending_approval", "suspended", "deactivated"]
        if status_in.account_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid account status: {status_in.account_status}")
        target_user.account_status = status_in.account_status
        changes["account_status"] = status_in.account_status

    if status_in.role is not None:
        valid_roles = ["admin", "fab_shop", "technician", "inspector", "viewer"]
        if status_in.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role: {status_in.role}")
        target_user.role = status_in.role
        changes["role"] = status_in.role

    if status_in.is_active is not None:
        target_user.is_active = status_in.is_active
        changes["is_active"] = status_in.is_active

    record_audit_log(db, current_user, "USER_STATUS_UPDATE", "User", str(target_user.id), changes)
    db.commit()
    db.refresh(target_user)
    return target_user

@router.post("/users", response_model=UserOut)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Admin endpoint to create pre-approved employee accounts."""
    existing = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists.")

    norm_phone = None
    if user_in.phone_number:
        try:
            norm_phone = normalize_phone_number(user_in.phone_number)
            if db.query(User).filter(User.phone_number == norm_phone).first():
                raise HTTPException(status_code=400, detail="Phone number is already registered.")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role,
        p_number=user_in.p_number,
        phone_number=norm_phone,
        hashed_password=get_password_hash(user_in.password),
        is_active=user_in.is_active,
        account_status=user_in.account_status or "active"
    )
    db.add(new_user)
    db.flush()
    record_audit_log(db, current_user, "CREATE", "User", str(new_user.id), {"username": new_user.username, "role": new_user.role})
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Admin endpoint to update full employee details."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        validate_password_strength(update_data["password"])
        user.hashed_password = get_password_hash(update_data.pop("password"))

    if "phone_number" in update_data and update_data["phone_number"]:
        update_data["phone_number"] = normalize_phone_number(update_data["phone_number"])

    for field, val in update_data.items():
        setattr(user, field, val)

    record_audit_log(db, current_user, "UPDATE", "User", str(user.id), {"fields": list(update_data.keys())})
    db.commit()
    db.refresh(user)
    return user

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.seed import seed_database
from backend.app.middleware.security import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    RequestSizeLimitMiddleware
)
from backend.app.routers import (
    auth,
    organization,
    jobs,
    technical,
    certificates,
    documents,
    reports,
    financials,
    audit,
    photos,
    settings as sys_settings
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise Valve Reclamation Management System & Exact QF-003-05-307 ANNEXURE-III Certificate Digitization for FFC Fabrication Shop, Goth Machhi, Sadiqabad, Pakistan.",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None
)

# Security & Performance Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Startup hook to automatically seed plants and initial accounts
@app.on_event("startup")
def on_startup():
    # Migrate any missing columns in existing SQLite tables
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check reclamation_jobs columns
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(reclamation_jobs)")).fetchall()]
            if "operation_categories" not in cols:
                conn.execute(text("ALTER TABLE reclamation_jobs ADD COLUMN operation_categories TEXT"))

            # Check certificates columns
            cert_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(certificates)")).fetchall()]
            if "gate_disc_plug_stellited" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN gate_disc_plug_stellited BOOLEAN DEFAULT 0"))
            if "gate_disc_plug_machined" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN gate_disc_plug_machined BOOLEAN DEFAULT 0"))
            if "gate_disc_plug_lapped" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN gate_disc_plug_lapped BOOLEAN DEFAULT 0"))
            if "gland_packing_specification" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN gland_packing_specification VARCHAR(255)"))
            if "bonnet_gasket_specification" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN bonnet_gasket_specification VARCHAR(255)"))
            if "special_note" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN special_note TEXT"))
            if "digital_signature" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN digital_signature TEXT"))
            if "digital_signature_date" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN digital_signature_date DATETIME"))
            if "signed_by_name" not in cert_cols:
                conn.execute(text("ALTER TABLE certificates ADD COLUMN signed_by_name VARCHAR(100)"))

            # Check work_entries columns
            we_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(work_entries)")).fetchall()]
            if "operation_categories" not in we_cols:
                conn.execute(text("ALTER TABLE work_entries ADD COLUMN operation_categories TEXT"))

            # Check users columns for Phone Auth, Verification, Lockout
            user_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            if "phone_number" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR(30)"))
            if "is_phone_verified" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_phone_verified BOOLEAN DEFAULT 0"))
            if "is_email_verified" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0"))
            if "account_status" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN account_status VARCHAR(30) DEFAULT 'active'"))
            if "email_verification_token" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255)"))
            if "email_verification_expires_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verification_expires_at DATETIME"))
            if "phone_otp_code" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone_otp_code VARCHAR(10)"))
            if "phone_otp_expires_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone_otp_expires_at DATETIME"))
            if "phone_otp_attempts" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone_otp_attempts INTEGER DEFAULT 0"))
            if "password_reset_token" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)"))
            if "password_reset_expires_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME"))
            if "password_reset_otp" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_otp VARCHAR(10)"))
            if "password_reset_otp_expires_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_otp_expires_at DATETIME"))
            if "failed_login_attempts" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0"))
            if "locked_until" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN locked_until DATETIME"))

            conn.commit()
    except Exception as e:
        print("Schema auto-migration notice:", e)

    seed_database()

# Health Checks
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "location": "Fabrication Shop, Goth Machhi, FFC",
        "database": "connected"
    }

# Register Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(organization.router, prefix=settings.API_PREFIX)
app.include_router(jobs.router, prefix=settings.API_PREFIX)
app.include_router(technical.router, prefix=settings.API_PREFIX)
app.include_router(certificates.router, prefix=settings.API_PREFIX)
app.include_router(documents.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(financials.router, prefix=settings.API_PREFIX)
app.include_router(audit.router, prefix=settings.API_PREFIX)
app.include_router(photos.router, prefix=settings.API_PREFIX)
app.include_router(sys_settings.router, prefix=settings.API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)

import os
import warnings
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "FFC Valve Reclamation Management System"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    API_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ffc_valves.db")

    # Security & Tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ffc_fabrication_shop_secret_key_2026_super_secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    # Account Policies & Throttling
    ACCOUNT_APPROVAL_REQUIRED: bool = os.getenv("ACCOUNT_APPROVAL_REQUIRED", "false").lower() in ["true", "1", "yes"]
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    LOCKOUT_MINUTES: int = int(os.getenv("LOCKOUT_MINUTES", "15"))
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    AUTH_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "10"))
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB

    # CORS configuration
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Storage Directories
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", str(BASE_DIR / "storage"))
    CERTIFICATES_DIR: str = os.getenv("CERTIFICATES_DIR", str(BASE_DIR / "storage" / "certificates"))
    DOCUMENTS_DIR: str = os.getenv("DOCUMENTS_DIR", str(BASE_DIR / "storage" / "documents"))
    PHOTOS_DIR: str = os.getenv("PHOTOS_DIR", str(BASE_DIR / "storage" / "photos"))

    # Business Logic Defaults
    DEFAULT_VR_PREFIX: str = "VR"
    DEFAULT_CERT_PREFIX: str = "CERT"
    FINANCIAL_TRACKING_ENABLED: bool = True

    # Email & SMS Provider Settings (Optional integration)
    EMAIL_FROM_ADDRESS: str = os.getenv("EMAIL_FROM_ADDRESS", "reclamations@ffc.com.pk")
    SMS_SENDER_ID: str = os.getenv("SMS_SENDER_ID", "FFC-VALVES")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# In production mode, ensure default secret key is not used
if settings.APP_ENV == "production" and settings.SECRET_KEY == "ffc_fabrication_shop_secret_key_2026_super_secure":
    warnings.warn(
        "CRITICAL SECURITY WARNING: Default SECRET_KEY is active in production environment! "
        "Set a unique SECRET_KEY in your .env or server environment.",
        RuntimeWarning,
        stacklevel=2
    )

# Ensure storage directories exist
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
os.makedirs(settings.CERTIFICATES_DIR, exist_ok=True)
os.makedirs(settings.DOCUMENTS_DIR, exist_ok=True)
os.makedirs(settings.PHOTOS_DIR, exist_ok=True)

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.models.user import User
from backend.app.services.auth import require_roles

router = APIRouter(prefix="/settings", tags=["System Settings"])

class SettingsUpdate(BaseModel):
    default_vr_prefix: str
    default_cert_prefix: str
    financial_tracking_enabled: bool

@router.get("")
def get_system_settings(current_user: User = Depends(require_roles(["admin"]))):
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "default_vr_prefix": settings.DEFAULT_VR_PREFIX,
        "default_cert_prefix": settings.DEFAULT_CERT_PREFIX,
        "financial_tracking_enabled": settings.FINANCIAL_TRACKING_ENABLED,
        "form_reference": "QF-003-05-307",
        "annexure": "ANNEXURE-III",
        "form_date": "13-05-2025",
        "organization": "Fauji Fertilizer Company (FFC)",
        "location": "Fabrication Shop, Goth Machhi, Sadiqabad, District Rahim Yar Khan, Punjab, Pakistan"
    }

@router.put("")
def update_system_settings(
    update_data: SettingsUpdate,
    current_user: User = Depends(require_roles(["admin"]))
):
    settings.DEFAULT_VR_PREFIX = update_data.default_vr_prefix
    settings.DEFAULT_CERT_PREFIX = update_data.default_cert_prefix
    settings.FINANCIAL_TRACKING_ENABLED = update_data.financial_tracking_enabled
    return {"message": "Settings updated successfully", "settings": update_data}

import json
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.audit import AuditLog
from backend.app.models.user import User

def record_audit_log(
    db: Session,
    user: User | None,
    action: str,
    entity_name: str,
    entity_id: str,
    details: dict | str = None,
    ip_address: str = None
):
    """Safely writes an immutable audit log record to the database."""
    details_str = json.dumps(details, default=str) if isinstance(details, dict) else str(details or "")
    log_entry = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else "SYSTEM",
        action=action,
        entity_name=entity_name,
        entity_id=str(entity_id),
        details=details_str,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.flush()
    return log_entry

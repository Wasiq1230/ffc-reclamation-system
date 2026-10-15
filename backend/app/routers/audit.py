from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.audit import AuditLog
from backend.app.models.user import User
from backend.app.services.auth import require_roles

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=dict)
def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    action: Optional[str] = None,
    entity_name: Optional[str] = None,
    username: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
    if username:
        query = query.filter(AuditLog.username == username)

    total = query.count()
    items = query.order_by(AuditLog.id.desc()).offset((page - 1) * limit).limit(limit).all()

    items_out = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "username": log.username,
            "action": log.action,
            "entity_name": log.entity_name,
            "entity_id": log.entity_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        }
        for log in items
    ]

    return {
        "items": items_out,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

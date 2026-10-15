from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime
from typing import Optional, List

from backend.app.database import get_db
from backend.app.models.job import ReclamationJob
from backend.app.models.financial import FinancialRecord
from backend.app.models.certificate import Certificate
from backend.app.models.user import User
from backend.app.schemas.financial import (
    FinancialUpdate,
    FinancialCreate,
    FinancialOut,
    FinancialListItemOut,
    FinancialListResponse,
    FinancialSummaryOut
)
from backend.app.services.auth import require_roles
from backend.app.services.audit_service import record_audit_log

router = APIRouter(prefix="/financials", tags=["Financial Records"])

def resolve_certificate_info(job: ReclamationJob) -> dict:
    """Accurately derive certificate status based on actual certificate records in the database."""
    latest_cert = None
    if job.certificates:
        # Sort by revision_number desc, then id desc
        latest_cert = sorted(job.certificates, key=lambda c: (c.revision_number or 0, c.id), reverse=True)[0]

    if not latest_cert:
        return {
            "certificate_status": "NOT_GENERATED",
            "certificate_status_label": "Not Generated",
            "certificate_id": None,
            "certificate_number": None,
            "certificate_workflow_status": None,
            "certificate_tooltip": "No test certificate has been generated yet for this valve reclamation."
        }
    
    cert_status = (latest_cert.status or "DRAFT").upper()
    if cert_status in ["ISSUED", "APPROVED"]:
        return {
            "certificate_status": "GENERATED",
            "certificate_status_label": "Generated",
            "certificate_id": latest_cert.id,
            "certificate_number": latest_cert.certificate_number,
            "certificate_workflow_status": cert_status,
            "certificate_tooltip": f"Official test certificate {latest_cert.certificate_number} is generated and ready for view/download."
        }
    elif cert_status in ["DRAFT", "AWAITING_REVIEW"]:
        return {
            "certificate_status": "PENDING_COMPLETION",
            "certificate_status_label": "Pending Completion",
            "certificate_id": latest_cert.id,
            "certificate_number": latest_cert.certificate_number,
            "certificate_workflow_status": cert_status,
            "certificate_tooltip": f"Certificate draft {latest_cert.certificate_number} requires additional test data or approval sign-off."
        }
    elif cert_status in ["CANCELLED"]:
        return {
            "certificate_status": "ERROR",
            "certificate_status_label": "Error",
            "certificate_id": latest_cert.id,
            "certificate_number": latest_cert.certificate_number,
            "certificate_workflow_status": cert_status,
            "certificate_tooltip": f"Certificate {latest_cert.certificate_number} was cancelled or encountered an error."
        }
    else:
        return {
            "certificate_status": "PENDING_COMPLETION",
            "certificate_status_label": "Pending Completion",
            "certificate_id": latest_cert.id,
            "certificate_number": latest_cert.certificate_number,
            "certificate_workflow_status": cert_status,
            "certificate_tooltip": f"Certificate {latest_cert.certificate_number} is currently in {cert_status} status."
        }

def resolve_finance_status_info(fin: Optional[FinancialRecord]) -> tuple[str, str]:
    """Accurately derive finance status based on charges, invoices, and payments received."""
    if not fin:
        return "UNPRICED", "Unpriced"
    
    fin.calculate_balance()
    target_amount = fin.actual_charges if fin.actual_charges > Decimal("0.00") else fin.approved_charges
    
    if fin.payments_received > Decimal("0.00") and fin.outstanding_balance <= Decimal("0.00") and target_amount > Decimal("0.00"):
        return "PAID", "Paid"
    elif fin.payments_received > Decimal("0.00") and fin.outstanding_balance > Decimal("0.00"):
        return "PARTIALLY_PAID", "Partially Paid"
    elif fin.invoice_number and fin.invoice_number.strip():
        return "INVOICED", "Invoiced"
    elif fin.approved_charges > Decimal("0.00") or fin.quoted_charges > Decimal("0.00"):
        return "PENDING", "Pending Payment"
    else:
        return "UNPRICED", "Unpriced"

@router.get("", response_model=FinancialListResponse)
def list_financial_records(
    search: Optional[str] = None,
    certificate_status: Optional[str] = None,
    finance_status: Optional[str] = None,
    source: Optional[str] = None,
    only_with_records: bool = True,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "viewer"]))
):
    query = db.query(ReclamationJob).filter(ReclamationJob.is_archived == False)
    
    if only_with_records:
        query = query.filter(ReclamationJob.financial_record.has())
        
    if source:
        query = query.filter(ReclamationJob.source == source)

    jobs = query.order_by(ReclamationJob.id.desc()).all()

    items: List[FinancialListItemOut] = []
    
    total_quoted = Decimal("0.00")
    total_approved = Decimal("0.00")
    total_invoiced = Decimal("0.00")
    total_received = Decimal("0.00")
    total_outstanding = Decimal("0.00")

    search_lower = search.lower().strip() if search else None

    for job in jobs:
        fin = job.financial_record
        cert_info = resolve_certificate_info(job)
        fin_code, fin_label = resolve_finance_status_info(fin)

        # Filters
        if certificate_status and cert_info["certificate_status"].upper() != certificate_status.upper():
            continue
            
        if finance_status and fin_code.upper() != finance_status.upper():
            continue

        inv_num = fin.invoice_number if fin else None
        
        # Search filter
        if search_lower:
            searchable_fields = [
                job.tracking_id or "",
                job.valve_description or "",
                job.valve_tag_no or "",
                job.valve_serial_no or "",
                job.notification_no or "",
                inv_num or "",
                job.plant.name if job.plant else "",
                job.department.name if job.department else "",
                job.external_customer.customer_name if job.external_customer else "",
            ]
            if not any(search_lower in f.lower() for f in searchable_fields):
                continue

        quoted = fin.quoted_charges if fin else Decimal("0.00")
        approved = fin.approved_charges if fin else Decimal("0.00")
        actual = fin.actual_charges if fin else Decimal("0.00")
        received = fin.payments_received if fin else Decimal("0.00")
        outstanding = fin.outstanding_balance if fin else Decimal("0.00")

        total_quoted += quoted
        total_approved += approved
        if inv_num and inv_num.strip():
            total_invoiced += approved if approved > Decimal("0.00") else actual
        total_received += received
        total_outstanding += outstanding

        items.append(
            FinancialListItemOut(
                id=fin.id if fin else None,
                job_id=job.id,
                tracking_id=job.tracking_id,
                valve_description=job.valve_description,
                valve_tag_no=job.valve_tag_no,
                valve_serial_no=job.valve_serial_no,
                priority=job.priority or "NORMAL",
                source=job.source,
                plant_name=job.plant.name if job.plant else None,
                department_name=job.department.name if job.department else None,
                customer_name=job.external_customer.customer_name if job.external_customer else None,
                notification_no=job.notification_no,
                job_status=job.status,
                has_financial_record=(fin is not None),
                quoted_charges=quoted,
                approved_charges=approved,
                actual_charges=actual,
                currency=fin.currency if fin else "PKR",
                invoice_number=inv_num,
                invoice_date=fin.invoice_date if fin else None,
                payments_received=received,
                payment_reference=fin.payment_reference if fin else None,
                payment_date=fin.payment_date if fin else None,
                outstanding_balance=outstanding,
                remarks=fin.remarks if fin else None,
                finance_status=fin_code,
                finance_status_label=fin_label,
                certificate_status=cert_info["certificate_status"],
                certificate_status_label=cert_info["certificate_status_label"],
                certificate_id=cert_info["certificate_id"],
                certificate_number=cert_info["certificate_number"],
                certificate_workflow_status=cert_info["certificate_workflow_status"],
                certificate_tooltip=cert_info["certificate_tooltip"],
                created_at=fin.created_at if fin else None,
                updated_at=fin.updated_at if fin else None,
            )
        )

    total_active_commercials = db.query(FinancialRecord).count()
    total_jobs = db.query(ReclamationJob).filter(ReclamationJob.is_archived == False).count()

    summary = FinancialSummaryOut(
        total_records=len(items),
        total_active_commercials=total_active_commercials,
        total_jobs=total_jobs,
        total_quoted=total_quoted,
        total_approved=total_approved,
        total_invoiced=total_invoiced,
        total_received=total_received,
        total_outstanding=total_outstanding
    )

    paginated_items = items[offset : offset + limit]

    return FinancialListResponse(
        items=paginated_items,
        total=len(items),
        summary=summary
    )

@router.get("/available-jobs")
def get_jobs_without_financials(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "viewer"]))
):
    """Retrieve reclamation jobs that do not yet have an active financial record."""
    jobs = (
        db.query(ReclamationJob)
        .outerjoin(FinancialRecord)
        .filter(FinancialRecord.id == None, ReclamationJob.is_archived == False)
        .order_by(ReclamationJob.id.desc())
        .all()
    )
    return {
        "items": [
            {
                "id": j.id,
                "tracking_id": j.tracking_id,
                "valve_description": j.valve_description,
                "valve_tag_no": j.valve_tag_no,
                "source": j.source,
                "plant_name": j.plant.name if j.plant else None,
                "department_name": j.department.name if j.department else None,
                "customer_name": j.external_customer.customer_name if j.external_customer else None,
                "priority": j.priority,
                "status": j.status,
            }
            for j in jobs
        ]
    }

@router.delete("/{record_id}")
def delete_financial_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """
    Safely delete a financial record.
    CRITICAL: Deleting this financial record NEVER deletes or damages the associated
    valve reclamation record, its certificates, or its photos.
    """
    fin = db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()
    if not fin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial record #{record_id} not found."
        )

    job_id = fin.job_id
    tracking_id = fin.job.tracking_id if fin.job else str(job_id)

    db.delete(fin)
    db.commit()

    record_audit_log(
        db,
        current_user,
        "DELETE",
        "FinancialRecord",
        str(record_id),
        {
            "job_id": job_id,
            "tracking_id": tracking_id,
            "note": "Commercial financial record deleted. Valve reclamation and certificates preserved intact."
        }
    )

    return {
        "success": True,
        "message": f"Financial record #{record_id} deleted successfully. Valve reclamation record {tracking_id} preserved.",
        "deleted_id": record_id,
        "job_id": job_id,
        "tracking_id": tracking_id
    }

@router.post("", response_model=FinancialOut)
def create_financial_record(
    fin_create: FinancialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Create a new commercial financial record for a valve reclamation job."""
    job = db.query(ReclamationJob).filter(ReclamationJob.id == fin_create.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Valve reclamation job #{fin_create.job_id} not found"
        )
    
    existing = db.query(FinancialRecord).filter(FinancialRecord.job_id == fin_create.job_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Financial record already exists for job #{fin_create.job_id}"
        )

    data = fin_create.model_dump()
    fin = FinancialRecord(**data)
    fin.calculate_balance()
    db.add(fin)
    db.commit()
    db.refresh(fin)

    record_audit_log(
        db, current_user, "CREATE", "FinancialRecord", str(fin.id),
        {"job_id": job.id, "tracking_id": job.tracking_id}
    )

    return fin

@router.put("/{record_id}", response_model=FinancialOut)
def update_financial_record(
    record_id: int,
    fin_update: FinancialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Update commercial figures for an existing financial record by ID."""
    fin = db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()
    if not fin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial record #{record_id} not found"
        )

    update_dict = fin_update.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(fin, k, v)

    fin.calculate_balance()
    fin.updated_at = datetime.utcnow()
    record_audit_log(db, current_user, "UPDATE", "FinancialRecord", str(fin.id), {"job_id": fin.job_id})
    db.commit()
    db.refresh(fin)
    return fin

@router.get("/job/{job_id}", response_model=FinancialOut)
def get_job_financials(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "viewer"]))
):
    """Retrieve or initialize financial record for a specific job."""
    fin = db.query(FinancialRecord).filter(FinancialRecord.job_id == job_id).first()
    if not fin:
        # Create empty record if none exists
        fin = FinancialRecord(job_id=job_id)
        db.add(fin)
        db.commit()
        db.refresh(fin)
    return fin

@router.put("/job/{job_id}", response_model=FinancialOut)
def update_job_financials(
    job_id: int,
    fin_update: FinancialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Update financial record by job ID."""
    fin = db.query(FinancialRecord).filter(FinancialRecord.job_id == job_id).first()
    if not fin:
        fin = FinancialRecord(job_id=job_id)
        db.add(fin)

    update_dict = fin_update.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(fin, k, v)

    fin.calculate_balance()
    fin.updated_at = datetime.utcnow()
    record_audit_log(db, current_user, "UPDATE", "FinancialRecord", str(fin.id), {"job_id": job_id})
    db.commit()
    db.refresh(fin)
    return fin

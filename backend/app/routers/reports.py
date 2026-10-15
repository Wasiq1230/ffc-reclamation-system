from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date
from decimal import Decimal
from backend.app.database import get_db
from backend.app.models.job import ReclamationJob
from backend.app.models.organization import Plant, Department, ExternalCustomer
from backend.app.models.certificate import Certificate
from backend.app.models.financial import FinancialRecord
from backend.app.models.user import User
from backend.app.schemas.reports import (
    DashboardMetricsOut,
    PlantMetric,
    DepartmentMetric,
    ExternalMetricSummary,
    ExternalCustomerMetric,
    FinancialSummaryMetric
)
from backend.app.services.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

def build_dept_metric(dept: Department, db: Session, date_from: Optional[date] = None, date_to: Optional[date] = None) -> DepartmentMetric:
    base_query = db.query(ReclamationJob).filter(
        ReclamationJob.department_id == dept.id,
        ReclamationJob.plant_id == dept.plant_id,
        ReclamationJob.is_archived == False
    )
    if date_from:
        base_query = base_query.filter(ReclamationJob.date_received >= date_from)
    if date_to:
        base_query = base_query.filter(ReclamationJob.date_received <= date_to)

    total_jobs = base_query.count()
    valve_qty = db.query(func.coalesce(func.sum(ReclamationJob.valve_quantity), 0)).filter(
        ReclamationJob.department_id == dept.id,
        ReclamationJob.plant_id == dept.plant_id,
        ReclamationJob.is_archived == False
    ).scalar()

    completed = base_query.filter(ReclamationJob.status.in_(["COMPLETED", "CERTIFICATE_ISSUED", "READY_FOR_DELIVERY", "DELIVERED"])).count()
    in_progress = base_query.filter(ReclamationJob.status.in_(["RECLAMATION_IN_PROGRESS", "INSPECTION_IN_PROGRESS", "TESTING_QUALITY_INSPECTION"])).count()
    pending = base_query.filter(ReclamationJob.status.in_(["RECEIVED", "REGISTERED", "AWAITING_APPROVAL_PARTS", "ON_HOLD", "REWORK_REQUIRED"])).count()

    cert_issued = db.query(Certificate).join(ReclamationJob).filter(
        ReclamationJob.department_id == dept.id,
        ReclamationJob.plant_id == dept.plant_id,
        Certificate.status == "ISSUED"
    ).count()

    cert_pending = db.query(Certificate).join(ReclamationJob).filter(
        ReclamationJob.department_id == dept.id,
        ReclamationJob.plant_id == dept.plant_id,
        Certificate.status.in_(["DRAFT", "AWAITING_REVIEW", "APPROVED"])
    ).count()

    return DepartmentMetric(
        department_id=dept.id,
        department_name=dept.name,
        department_code=dept.code,
        plant_id=dept.plant_id,
        plant_name=dept.plant.name,
        total_jobs=total_jobs,
        total_valve_qty=int(valve_qty or 0),
        completed_jobs=completed,
        in_progress_jobs=in_progress,
        pending_jobs=pending,
        certificates_issued=cert_issued,
        certificates_pending=cert_pending,
        monthly_jobs={}
    )

def build_plant_metric(plant: Plant, db: Session, date_from: Optional[date] = None, date_to: Optional[date] = None) -> PlantMetric:
    base_query = db.query(ReclamationJob).filter(
        ReclamationJob.plant_id == plant.id,
        ReclamationJob.is_archived == False
    )
    if date_from:
        base_query = base_query.filter(ReclamationJob.date_received >= date_from)
    if date_to:
        base_query = base_query.filter(ReclamationJob.date_received <= date_to)

    total_jobs = base_query.count()
    valve_qty = db.query(func.coalesce(func.sum(ReclamationJob.valve_quantity), 0)).filter(
        ReclamationJob.plant_id == plant.id,
        ReclamationJob.is_archived == False
    ).scalar()

    completed = base_query.filter(ReclamationJob.status.in_(["COMPLETED", "CERTIFICATE_ISSUED", "READY_FOR_DELIVERY", "DELIVERED"])).count()
    in_progress = base_query.filter(ReclamationJob.status.in_(["RECLAMATION_IN_PROGRESS", "INSPECTION_IN_PROGRESS", "TESTING_QUALITY_INSPECTION"])).count()
    pending = base_query.filter(ReclamationJob.status.in_(["RECEIVED", "REGISTERED", "AWAITING_APPROVAL_PARTS", "ON_HOLD", "REWORK_REQUIRED"])).count()

    cert_issued = db.query(Certificate).join(ReclamationJob).filter(
        ReclamationJob.plant_id == plant.id,
        Certificate.status == "ISSUED"
    ).count()

    cert_pending = db.query(Certificate).join(ReclamationJob).filter(
        ReclamationJob.plant_id == plant.id,
        Certificate.status.in_(["DRAFT", "AWAITING_REVIEW", "APPROVED"])
    ).count()

    dept_metrics = [build_dept_metric(d, db, date_from, date_to) for d in plant.departments if d.is_active]

    return PlantMetric(
        plant_id=plant.id,
        plant_name=plant.name,
        plant_code=plant.code,
        total_jobs=total_jobs,
        total_valve_qty=int(valve_qty or 0),
        completed_jobs=completed,
        in_progress_jobs=in_progress,
        pending_jobs=pending,
        certificates_issued=cert_issued,
        certificates_pending=cert_pending,
        departments=dept_metrics,
        monthly_jobs={}
    )

@router.get("/dashboard", response_model=DashboardMetricsOut)
def get_dashboard_metrics(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates all live production dashboard totals via backend SQL aggregations."""
    jobs_q = db.query(ReclamationJob).filter(ReclamationJob.is_archived == False)
    if date_from:
        jobs_q = jobs_q.filter(ReclamationJob.date_received >= date_from)
    if date_to:
        jobs_q = jobs_q.filter(ReclamationJob.date_received <= date_to)

    total_jobs = jobs_q.count()
    total_valves = db.query(func.coalesce(func.sum(ReclamationJob.valve_quantity), 0)).filter(
        ReclamationJob.is_archived == False
    ).scalar() or 0

    # Status breakdown
    status_counts = dict(
        db.query(ReclamationJob.status, func.count(ReclamationJob.id))
        .filter(ReclamationJob.is_archived == False)
        .group_by(ReclamationJob.status)
        .all()
    )

    jobs_received = status_counts.get("RECEIVED", 0) + status_counts.get("REGISTERED", 0)
    jobs_in_progress = status_counts.get("RECLAMATION_IN_PROGRESS", 0) + status_counts.get("INSPECTION_IN_PROGRESS", 0)
    jobs_awaiting = status_counts.get("AWAITING_APPROVAL_PARTS", 0)
    jobs_testing = status_counts.get("TESTING_QUALITY_INSPECTION", 0)
    jobs_completed = status_counts.get("COMPLETED", 0)
    jobs_cert_issued = status_counts.get("CERTIFICATE_ISSUED", 0)
    jobs_ready_delivery = status_counts.get("READY_FOR_DELIVERY", 0)
    jobs_delivered = status_counts.get("DELIVERED", 0)
    jobs_on_hold = status_counts.get("ON_HOLD", 0)

    # Overdue jobs
    today = date.today()
    overdue_count = jobs_q.filter(
        ReclamationJob.required_completion_date < today,
        ReclamationJob.status.notin_(["COMPLETED", "CERTIFICATE_ISSUED", "DELIVERED", "CANCELLED"])
    ).count()

    # Certificates pending approval
    certs_pending = db.query(Certificate).filter(
        Certificate.status.in_(["DRAFT", "AWAITING_REVIEW", "APPROVED"])
    ).count()

    # Plants
    p1 = db.query(Plant).filter(Plant.code == "PLANT_1").first()
    p2 = db.query(Plant).filter(Plant.code == "PLANT_2").first()

    plant1_metric = build_plant_metric(p1, db, date_from, date_to) if p1 else None
    plant2_metric = build_plant_metric(p2, db, date_from, date_to) if p2 else None

    # External Customer Metrics
    ext_q = db.query(ReclamationJob).filter(
        ReclamationJob.source == "EXTERNAL",
        ReclamationJob.is_archived == False
    )
    ext_total_jobs = ext_q.count()
    ext_valves = db.query(func.coalesce(func.sum(ReclamationJob.valve_quantity), 0)).filter(
        ReclamationJob.source == "EXTERNAL",
        ReclamationJob.is_archived == False
    ).scalar() or 0

    ext_completed = ext_q.filter(ReclamationJob.status.in_(["COMPLETED", "CERTIFICATE_ISSUED", "DELIVERED"])).count()
    ext_in_prog = ext_q.filter(ReclamationJob.status.in_(["RECLAMATION_IN_PROGRESS", "INSPECTION_IN_PROGRESS", "TESTING_QUALITY_INSPECTION"])).count()
    ext_cert_issued = db.query(Certificate).join(ReclamationJob).filter(
        ReclamationJob.source == "EXTERNAL",
        Certificate.status == "ISSUED"
    ).count()

    ext_customers = db.query(ExternalCustomer).filter(ExternalCustomer.is_active == True).all()
    customer_metrics = []
    for c in ext_customers:
        c_jobs = db.query(ReclamationJob).filter(ReclamationJob.external_customer_id == c.id, ReclamationJob.is_archived == False)
        c_valves = db.query(func.coalesce(func.sum(ReclamationJob.valve_quantity), 0)).filter(ReclamationJob.external_customer_id == c.id).scalar() or 0
        customer_metrics.append(ExternalCustomerMetric(
            customer_id=c.id,
            customer_name=c.customer_name,
            plant_facility_name=c.plant_facility_name,
            total_jobs=c_jobs.count(),
            total_valve_qty=int(c_valves),
            completed_jobs=c_jobs.filter(ReclamationJob.status.in_(["COMPLETED", "CERTIFICATE_ISSUED", "DELIVERED"])).count(),
            in_progress_jobs=c_jobs.filter(ReclamationJob.status.in_(["RECLAMATION_IN_PROGRESS", "INSPECTION_IN_PROGRESS"])).count(),
            certificates_issued=db.query(Certificate).join(ReclamationJob).filter(ReclamationJob.external_customer_id == c.id, Certificate.status == "ISSUED").count(),
            total_charges=Decimal("0.00"),
            outstanding_balance=Decimal("0.00")
        ))

    external_summary = ExternalMetricSummary(
        total_jobs=ext_total_jobs,
        total_valve_qty=int(ext_valves),
        completed_jobs=ext_completed,
        in_progress_jobs=ext_in_prog,
        certificates_issued=ext_cert_issued,
        customers=customer_metrics,
        monthly_jobs={}
    )

    # Financial summary
    fin_summary = None
    if current_user.role in ["admin", "viewer"]:
        totals = db.query(
            func.coalesce(func.sum(FinancialRecord.quoted_charges), 0),
            func.coalesce(func.sum(FinancialRecord.approved_charges), 0),
            func.coalesce(func.sum(FinancialRecord.actual_charges), 0),
            func.coalesce(func.sum(FinancialRecord.payments_received), 0),
            func.coalesce(func.sum(FinancialRecord.outstanding_balance), 0),
        ).first()
        fin_summary = FinancialSummaryMetric(
            total_quoted=Decimal(str(totals[0])),
            total_approved=Decimal(str(totals[1])),
            total_actual=Decimal(str(totals[2])),
            total_received=Decimal(str(totals[3])),
            total_outstanding=Decimal(str(totals[4]))
        )

    return DashboardMetricsOut(
        total_jobs=total_jobs,
        total_valve_quantity=int(total_valves),
        jobs_received=jobs_received,
        jobs_in_progress=jobs_in_progress,
        jobs_awaiting_parts_or_approval=jobs_awaiting,
        jobs_in_testing=jobs_testing,
        jobs_completed=jobs_completed,
        jobs_certificates_issued=jobs_cert_issued,
        jobs_certificates_pending=certs_pending,
        jobs_ready_for_delivery=jobs_ready_delivery,
        jobs_delivered=jobs_delivered,
        jobs_on_hold=jobs_on_hold,
        jobs_overdue=overdue_count,
        external_jobs_count=ext_total_jobs,
        ffc_plant1_total=plant1_metric.total_jobs if plant1_metric else 0,
        ffc_plant2_total=plant2_metric.total_jobs if plant2_metric else 0,
        status_breakdown=status_counts,
        monthly_trend={},
        plant1_metric=plant1_metric,
        plant2_metric=plant2_metric,
        external_metric=external_summary,
        financial_summary=fin_summary
    )

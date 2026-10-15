from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date
from backend.app.database import get_db
from backend.app.models.job import ReclamationJob, StatusHistory, JobAssignment
from backend.app.models.organization import Plant, Department, ExternalCustomer
from backend.app.models.user import User
from backend.app.models.certificate import Certificate
from backend.app.schemas.job import JobCreate, JobUpdate, JobOut, JobDetailOut, StatusUpdate
from backend.app.services.auth import get_current_user, require_roles
from backend.app.services.id_generator import generate_next_sequence_id
from backend.app.services.audit_service import record_audit_log
from backend.app.services.export_service import export_jobs_to_csv, export_jobs_to_excel

router = APIRouter(prefix="/jobs", tags=["Reclamation Jobs"])

VALID_STATUSES = [
    "RECEIVED", "REGISTERED", "INSPECTION_IN_PROGRESS", "AWAITING_APPROVAL_PARTS",
    "RECLAMATION_IN_PROGRESS", "TESTING_QUALITY_INSPECTION", "REWORK_REQUIRED",
    "COMPLETED", "CERTIFICATE_ISSUED", "READY_FOR_DELIVERY", "DELIVERED",
    "ON_HOLD", "CANCELLED"
]

def format_job_out(job: ReclamationJob) -> dict:
    """Helper to convert ReclamationJob model into JobOut schema dict with resolved names."""
    latest_cert = None
    if job.certificates:
        # find the highest revision or most recent
        latest_cert = sorted(job.certificates, key=lambda c: (c.revision_number, c.id), reverse=True)[0]
    
    return {
        "id": job.id,
        "tracking_id": job.tracking_id,
        "registration_date": job.registration_date,
        "date_received": job.date_received,
        "source": job.source,
        "plant_id": job.plant_id,
        "department_id": job.department_id,
        "external_customer_id": job.external_customer_id,
        "notification_no": job.notification_no,
        "work_order_ref": job.work_order_ref,
        "priority": job.priority,
        "status": job.status,
        "assigned_technician_id": job.assigned_technician_id,
        "required_completion_date": job.required_completion_date,
        "valve_serial_no": job.valve_serial_no,
        "valve_tag_no": job.valve_tag_no,
        "valve_description": job.valve_description,
        "valve_type": job.valve_type,
        "manufacturer": job.manufacturer,
        "model": job.model,
        "size": job.size,
        "pressure_rating": job.pressure_rating,
        "valve_quantity": job.valve_quantity,
        "valve_material": job.valve_material,
        "process_service_details": job.process_service_details,
        "additional_technical_desc": job.additional_technical_desc,
        "general_remarks": job.general_remarks,
        "operation_categories": job.operation_categories,
        "is_archived": job.is_archived,
        "created_by_id": job.created_by_id,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "plant_name": job.plant.name if job.plant else None,
        "department_name": job.department.name if job.department else None,
        "customer_name": job.external_customer.customer_name if job.external_customer else None,
        "technician_name": job.assigned_technician.full_name if job.assigned_technician else None,
        "certificate_status": latest_cert.status if latest_cert else "NOT_CREATED",
        "certificate_id": latest_cert.id if latest_cert else None,
    }

@router.get("", response_model=dict)
def list_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    source: Optional[str] = None,
    plant_id: Optional[int] = None,
    department_id: Optional[int] = None,
    external_customer_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    valve_type: Optional[str] = None,
    assigned_technician_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ReclamationJob).options(
        joinedload(ReclamationJob.plant),
        joinedload(ReclamationJob.department),
        joinedload(ReclamationJob.external_customer),
        joinedload(ReclamationJob.assigned_technician),
        joinedload(ReclamationJob.certificates)
    )

    if not include_archived:
        query = query.filter(ReclamationJob.is_archived == False)

    if source:
        query = query.filter(ReclamationJob.source == source)
    if plant_id:
        query = query.filter(ReclamationJob.plant_id == plant_id)
    if department_id:
        query = query.filter(ReclamationJob.department_id == department_id)
    if external_customer_id:
        query = query.filter(ReclamationJob.external_customer_id == external_customer_id)
    if status:
        query = query.filter(ReclamationJob.status == status)
    if priority:
        query = query.filter(ReclamationJob.priority == priority)
    if valve_type:
        query = query.filter(ReclamationJob.valve_type == valve_type)
    if assigned_technician_id:
        query = query.filter(ReclamationJob.assigned_technician_id == assigned_technician_id)
    if date_from:
        query = query.filter(ReclamationJob.date_received >= date_from)
    if date_to:
        query = query.filter(ReclamationJob.date_received <= date_to)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (ReclamationJob.tracking_id.ilike(search_pattern)) |
            (ReclamationJob.notification_no.ilike(search_pattern)) |
            (ReclamationJob.valve_tag_no.ilike(search_pattern)) |
            (ReclamationJob.valve_serial_no.ilike(search_pattern)) |
            (ReclamationJob.valve_description.ilike(search_pattern)) |
            (ReclamationJob.work_order_ref.ilike(search_pattern))
        )

    total_count = query.count()
    jobs = query.order_by(ReclamationJob.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "items": [format_job_out(j) for j in jobs],
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit if total_count > 0 else 1
    }

@router.post("", response_model=JobOut)
def register_reclamation_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop"]))
):
    # Strict validation of Organizational Boundaries
    if job_in.source in ["PLANT_1", "PLANT_2"]:
        if not job_in.plant_id or not job_in.department_id:
            raise HTTPException(
                status_code=400,
                detail=f"Plant and Department are mandatory for FFC jobs ({job_in.source})"
            )
        dept = db.query(Department).filter(
            Department.id == job_in.department_id,
            Department.plant_id == job_in.plant_id,
            Department.is_active == True
        ).first()
        if not dept:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Department ID {job_in.department_id} for Plant ID {job_in.plant_id}. Cross-plant department assignment is strictly forbidden."
            )
        # Ensure plant matches source
        plant = db.query(Plant).filter(Plant.id == job_in.plant_id).first()
        if job_in.source == "PLANT_1" and plant.code != "PLANT_1":
            raise HTTPException(status_code=400, detail="Job source PLANT_1 must use Plant 1")
        if job_in.source == "PLANT_2" and plant.code != "PLANT_2":
            raise HTTPException(status_code=400, detail="Job source PLANT_2 must use Plant 2")
    elif job_in.source == "EXTERNAL":
        if not job_in.external_customer_id:
            raise HTTPException(
                status_code=400,
                detail="External Customer is mandatory for Miscellaneous / External jobs."
            )
        cust = db.query(ExternalCustomer).filter(
            ExternalCustomer.id == job_in.external_customer_id,
            ExternalCustomer.is_active == True
        ).first()
        if not cust:
            raise HTTPException(status_code=400, detail="External customer not found or inactive")
        # Ensure external jobs don't carry accidental FFC plant/dept
        job_in.plant_id = None
        job_in.department_id = None

    # Atomic Sequence Generation inside transaction
    tracking_id = generate_next_sequence_id(db)

    new_job = ReclamationJob(
        tracking_id=tracking_id,
        created_by_id=current_user.id,
        status="RECEIVED",
        **job_in.model_dump()
    )
    db.add(new_job)
    db.flush()

    # Initial status history record
    initial_status = StatusHistory(
        job_id=new_job.id,
        previous_status="NEW",
        new_status="RECEIVED",
        changed_by_id=current_user.id,
        reason="Initial registration into Fabrication Shop system"
    )
    db.add(initial_status)

    record_audit_log(
        db, current_user, "CREATE", "ReclamationJob", str(new_job.id),
        {"tracking_id": tracking_id, "source": new_job.source, "valve_desc": new_job.valve_description}
    )
    db.commit()
    db.refresh(new_job)

    return format_job_out(new_job)

@router.get("/{job_id}", response_model=JobDetailOut)
def get_job_detail(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(ReclamationJob).options(
        joinedload(ReclamationJob.plant),
        joinedload(ReclamationJob.department),
        joinedload(ReclamationJob.external_customer),
        joinedload(ReclamationJob.assigned_technician),
        joinedload(ReclamationJob.inspections),
        joinedload(ReclamationJob.work_entries),
        joinedload(ReclamationJob.materials),
        joinedload(ReclamationJob.tests),
        joinedload(ReclamationJob.certificates),
        joinedload(ReclamationJob.documents),
        joinedload(ReclamationJob.photos),
        joinedload(ReclamationJob.financial_record),
        joinedload(ReclamationJob.status_history)
    ).filter(ReclamationJob.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Reclamation job not found")

    job_data = format_job_out(job)
    job_data["hold_reason"] = job.hold_reason
    job_data["delivery_date"] = job.delivery_date
    job_data["delivery_recipient"] = job.delivery_recipient
    job_data["delivery_acknowledgment"] = job.delivery_acknowledgment
    job_data["inspections"] = job.inspections
    job_data["work_entries"] = job.work_entries
    job_data["materials"] = job.materials
    job_data["tests"] = job.tests
    job_data["certificates"] = job.certificates
    job_data["documents"] = job.documents
    job_data["photos"] = [
        {
            "id": p.id,
            "job_id": p.job_id,
            "stage": p.stage,
            "title": p.title,
            "work_description": p.work_description,
            "performed_by_id": p.performed_by_id,
            "performed_by_name": p.performed_by_name or (p.performed_by.full_name if p.performed_by else "Assigned Staff"),
            "department_id": p.department_id,
            "department_name": p.department_name or (p.department.name if p.department else "Fabrication Shop"),
            "file_name": p.file_name,
            "file_size": p.file_size,
            "content_type": p.content_type,
            "taken_at": p.taken_at,
            "uploaded_by_id": p.uploaded_by_id,
            "created_at": p.created_at,
            "url": f"/api/photos/{p.id}/file"
        }
        for p in (job.photos or [])
    ]
    job_data["financial_record"] = job.financial_record
    
    # Enrich status history with user names
    status_history_list = []
    for sh in job.status_history:
        status_history_list.append({
            "id": sh.id,
            "previous_status": sh.previous_status,
            "new_status": sh.new_status,
            "changed_by_id": sh.changed_by_id,
            "changed_by_name": sh.user.full_name if sh.user else "System",
            "timestamp": sh.timestamp,
            "reason": sh.reason
        })
    job_data["status_history"] = status_history_list

    return job_data

@router.put("/{job_id}", response_model=JobOut)
def update_job_details(
    job_id: int,
    job_update: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop", "technician"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Reclamation job not found")

    update_dict = job_update.model_dump(exclude_unset=True)

    # Validate plant and department if changed
    target_plant = update_dict.get("plant_id", job.plant_id)
    target_dept = update_dict.get("department_id", job.department_id)
    target_source = update_dict.get("source", job.source)

    if target_source in ["PLANT_1", "PLANT_2"] and (target_plant or target_dept):
        dept = db.query(Department).filter(
            Department.id == target_dept,
            Department.plant_id == target_plant,
            Department.is_active == True
        ).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid Plant and Department combination")

    for k, v in update_dict.items():
        setattr(job, k, v)

    # Synchronize unissued certificates with updated valve information
    for cert in (job.certificates or []):
        if cert.status != "ISSUED":
            if "notification_no" in update_dict:
                cert.notification_no = job.notification_no
            if "valve_description" in update_dict:
                cert.valve_description = job.valve_description
            if "valve_tag_no" in update_dict or "valve_serial_no" in update_dict:
                cert.identification_no = job.valve_serial_no or job.valve_tag_no or job.tracking_id
            if job.department:
                cert.area = job.department.name

    job.updated_at = datetime.utcnow()
    record_audit_log(
        db, current_user, "UPDATE", "ReclamationJob", str(job.id),
        {"updated_fields": list(update_dict.keys()), "tracking_id": job.tracking_id}
    )
    db.commit()
    db.refresh(job)
    return format_job_out(job)

@router.post("/{job_id}/status", response_model=JobOut)
def transition_job_status(
    job_id: int,
    status_in: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop", "technician", "inspector"]))
):
    if status_in.new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status_in.new_status}")

    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Reclamation job not found")

    prev_status = job.status
    job.status = status_in.new_status
    if status_in.new_status == "ON_HOLD":
        job.hold_reason = status_in.reason

    history = StatusHistory(
        job_id=job.id,
        previous_status=prev_status,
        new_status=status_in.new_status,
        changed_by_id=current_user.id,
        reason=status_in.reason
    )
    db.add(history)
    record_audit_log(
        db, current_user, "STATUS_CHANGE", "ReclamationJob", str(job.id),
        {"from": prev_status, "to": status_in.new_status, "reason": status_in.reason}
    )
    db.commit()
    db.refresh(job)
    return format_job_out(job)

@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Reclamation job not found")

    tracking_id = job.tracking_id
    record_audit_log(
        db, current_user, "DELETE", "ReclamationJob", str(job.id),
        {"tracking_id": tracking_id, "valve_desc": job.valve_description}
    )
    db.delete(job)
    db.commit()
    return {
        "success": True,
        "message": f"Reclamation entry {tracking_id} successfully deleted."
    }

# ----------------- Exports -----------------
@router.get("/export/csv")
def export_csv(
    source: Optional[str] = None,
    plant_id: Optional[int] = None,
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ReclamationJob).options(
        joinedload(ReclamationJob.plant),
        joinedload(ReclamationJob.department),
        joinedload(ReclamationJob.external_customer),
        joinedload(ReclamationJob.assigned_technician)
    ).filter(ReclamationJob.is_archived == False)

    if source:
        query = query.filter(ReclamationJob.source == source)
    if plant_id:
        query = query.filter(ReclamationJob.plant_id == plant_id)
    if department_id:
        query = query.filter(ReclamationJob.department_id == department_id)
    if status:
        query = query.filter(ReclamationJob.status == status)

    jobs = query.all()
    jobs_data = [format_job_out(j) for j in jobs]
    csv_content = export_jobs_to_csv(jobs_data)

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=FFC_Reclamation_Register_{date.today()}.csv"}
    )

@router.get("/export/excel")
def export_excel(
    source: Optional[str] = None,
    plant_id: Optional[int] = None,
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ReclamationJob).options(
        joinedload(ReclamationJob.plant),
        joinedload(ReclamationJob.department),
        joinedload(ReclamationJob.external_customer),
        joinedload(ReclamationJob.assigned_technician)
    ).filter(ReclamationJob.is_archived == False)

    if source:
        query = query.filter(ReclamationJob.source == source)
    if plant_id:
        query = query.filter(ReclamationJob.plant_id == plant_id)
    if department_id:
        query = query.filter(ReclamationJob.department_id == department_id)
    if status:
        query = query.filter(ReclamationJob.status == status)

    jobs = query.all()
    jobs_data = [format_job_out(j) for j in jobs]
    excel_bytes = export_jobs_to_excel(jobs_data)

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=FFC_Reclamation_Register_{date.today()}.xlsx"}
    )

import os
import time
import base64
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.job import ReclamationJob, StatusHistory
from backend.app.models.certificate import Certificate
from backend.app.models.user import User
from backend.app.models.organization import Plant, Department
from backend.app.models.document import DocumentAttachment
from backend.app.models.technical import PressureTest
from backend.app.schemas.certificate import (
    CertificateCreate,
    CertificateUpdate,
    CertificateOut,
    CertificateReviseRequest
)
from backend.app.services.auth import get_current_user, require_roles
from backend.app.services.id_generator import generate_next_sequence_id
from backend.app.services.audit_service import record_audit_log
from backend.app.services.certificate_pdf import generate_ffc_certificate_pdf
from backend.app.services.ocr_service import extract_text_from_image_async, parse_certificate_text

router = APIRouter(prefix="/certificates", tags=["Certificates & Digitization"])

@router.get("", response_model=dict)
def list_certificates(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Certificate).options(
        joinedload(Certificate.job),
        joinedload(Certificate.created_by),
        joinedload(Certificate.approved_by),
        joinedload(Certificate.issued_by)
    )

    if status:
        query = query.filter(Certificate.status == status)
    if job_id:
        query = query.filter(Certificate.job_id == job_id)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Certificate.certificate_number.ilike(search_pattern)) |
            (Certificate.identification_no.ilike(search_pattern)) |
            (Certificate.notification_no.ilike(search_pattern)) |
            (Certificate.area.ilike(search_pattern)) |
            (Certificate.valve_description.ilike(search_pattern))
        )

    total_count = query.count()
    certs = query.order_by(Certificate.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "items": certs,
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit if total_count > 0 else 1
    }

@router.post("/from-job/{job_id}", response_model=CertificateOut)
def create_certificate_from_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop", "inspector"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Reclamation job not found")

    # Determine Area string
    if job.source in ["PLANT_1", "PLANT_2"] and job.plant and job.department:
        area_str = f"{job.plant.name} — {job.department.name}"
    elif job.external_customer:
        area_str = f"{job.external_customer.customer_name} ({job.external_customer.plant_facility_name or 'External'})"
    else:
        area_str = job.source

    cert_number = generate_next_sequence_id(db, prefix=settings.DEFAULT_CERT_PREFIX)

    # Check if there are completed pressure tests on the job to pre-populate
    seat_us_hyd = False
    seat_us_pneu = False
    seat_us_press = None
    seat_us_res = None
    seat_ds_hyd = False
    seat_ds_pneu = False
    seat_ds_press = None
    seat_ds_res = None
    body_hyd = False
    body_pneu = False
    body_press = None
    body_res = None

    for t in job.tests:
        if t.test_category == "SEAT_TEST_US":
            seat_us_hyd = (t.test_method == "HYDRAULIC")
            seat_us_pneu = (t.test_method == "PNEUMATIC")
            seat_us_press = f"{t.test_pressure} {t.pressure_unit}"
            seat_us_res = t.actual_result
        elif t.test_category == "SEAT_TEST_DS":
            seat_ds_hyd = (t.test_method == "HYDRAULIC")
            seat_ds_pneu = (t.test_method == "PNEUMATIC")
            seat_ds_press = f"{t.test_pressure} {t.pressure_unit}"
            seat_ds_res = t.actual_result
        elif t.test_category == "BODY_TEST":
            body_hyd = (t.test_method == "HYDRAULIC")
            body_pneu = (t.test_method == "PNEUMATIC")
            body_press = f"{t.test_pressure} {t.pressure_unit}"
            body_res = t.actual_result

    new_cert = Certificate(
        certificate_number=cert_number,
        job_id=job.id,
        identification_no=job.tracking_id,
        certificate_date=date.today(),
        area=area_str,
        notification_no=job.notification_no or "",
        valve_description=f"{job.valve_description} ({job.size or ''} {job.pressure_rating or ''})".strip(),
        created_by_id=current_user.id,
        status="DRAFT",
        revision_number=0,
        seat_test_us_hyd=seat_us_hyd,
        seat_test_us_pneumatic=seat_us_pneu,
        seat_test_us_pressure=seat_us_press,
        seat_test_us_result=seat_us_res,
        seat_test_ds_hyd=seat_ds_hyd,
        seat_test_ds_pneumatic=seat_ds_pneu,
        seat_test_ds_pressure=seat_ds_press,
        seat_test_ds_result=seat_ds_res,
        body_test_hyd=body_hyd,
        body_test_pneumatic=body_pneu,
        body_test_pressure=body_press,
        body_test_result=body_res,
    )

    db.add(new_cert)
    db.flush()
    record_audit_log(
        db, current_user, "CREATE", "Certificate", str(new_cert.id),
        {"cert_no": cert_number, "job_id": job.id}
    )
    db.commit()
    db.refresh(new_cert)
    return new_cert

@router.get("/{cert_id}", response_model=CertificateOut)
def get_certificate(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert

@router.put("/{cert_id}", response_model=CertificateOut)
def update_certificate(
    cert_id: int,
    cert_in: CertificateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop", "inspector", "technician"]))
):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    if cert.status == "ISSUED":
        raise HTTPException(
            status_code=400,
            detail="Issued certificates are locked against silent edits. Use the formal revision workflow to revise an issued certificate."
        )

    update_dict = cert_in.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(cert, k, v)

    cert.updated_at = datetime.utcnow()
    record_audit_log(
        db, current_user, "UPDATE", "Certificate", str(cert.id),
        {"updated_fields": list(update_dict.keys())}
    )
    db.commit()
    db.refresh(cert)
    return cert

@router.post("/{cert_id}/submit", response_model=CertificateOut)
def submit_certificate_for_review(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop", "technician"]))
):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if cert.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Cannot submit certificate with status: {cert.status}")

    cert.status = "AWAITING_REVIEW"
    record_audit_log(db, current_user, "SUBMIT_REVIEW", "Certificate", str(cert.id))
    db.commit()
    db.refresh(cert)
    return cert

@router.post("/{cert_id}/approve", response_model=CertificateOut)
def approve_certificate(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "inspector"]))
):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if cert.status not in ["DRAFT", "AWAITING_REVIEW"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve certificate with status: {cert.status}")

    cert.status = "APPROVED"
    cert.approved_by_id = current_user.id
    cert.approved_at = datetime.utcnow()
    record_audit_log(db, current_user, "APPROVE", "Certificate", str(cert.id))
    db.commit()
    db.refresh(cert)
    return cert

@router.post("/{cert_id}/issue", response_model=CertificateOut)
def issue_certificate(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "inspector"]))
):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if cert.status not in ["APPROVED", "AWAITING_REVIEW", "DRAFT"]:
        raise HTTPException(status_code=400, detail=f"Cannot issue certificate with status: {cert.status}")

    cert.status = "ISSUED"
    cert.issued_by_id = current_user.id
    cert.issued_at = datetime.utcnow()
    if not cert.approved_by_id:
        cert.approved_by_id = current_user.id
        cert.approved_at = datetime.utcnow()

    # Generate ReportLab A4 PDF
    filename = f"{cert.certificate_number}_Rev{cert.revision_number}.pdf"
    pdf_full_path = os.path.join(settings.CERTIFICATES_DIR, filename)

    cert_data = {
        "certificate_number": cert.certificate_number,
        "identification_no": cert.identification_no,
        "certificate_date": str(cert.certificate_date),
        "area": cert.area,
        "notification_no": cert.notification_no or "",
        "valve_description": cert.valve_description,
        "form_reference": cert.form_reference,
        "annexure": cert.annexure,
        "form_ref_date": cert.form_ref_date,
        "status": cert.status,
        "revision_number": cert.revision_number,
        # Checkboxes
        "body_seat_stellited": cert.body_seat_stellited,
        "body_seat_machined": cert.body_seat_machined,
        "body_seat_lapped": cert.body_seat_lapped,
        "gate_disc_plug_warehouse_code": cert.gate_disc_plug_warehouse_code,
        "gate_disc_plug_stellited": cert.gate_disc_plug_stellited,
        "gate_disc_plug_machined": cert.gate_disc_plug_machined,
        "gate_disc_plug_lapped": cert.gate_disc_plug_lapped,
        "back_seat_bushing_stellited": cert.back_seat_bushing_stellited,
        "back_seat_bushing_machined": cert.back_seat_bushing_machined,
        "back_seat_bushing_lapped": cert.back_seat_bushing_lapped,
        "back_seat_stem_stellited": cert.back_seat_stem_stellited,
        "back_seat_stem_machined": cert.back_seat_stem_machined,
        "back_seat_stem_lapped": cert.back_seat_stem_lapped,
        "stem_built_up": cert.stem_built_up,
        "stem_machined": cert.stem_machined,
        "stem_polish": cert.stem_polish,
        "gland_packing_warehouse_code": cert.gland_packing_warehouse_code,
        "gland_packing_specification": cert.gland_packing_specification,
        "gland_packing_comp_rpr": cert.gland_packing_comp_rpr,
        "gland_packing_partl_rpr": cert.gland_packing_partl_rpr,
        "bonnet_gasket_warehouse_code": cert.bonnet_gasket_warehouse_code,
        "bonnet_gasket_specification": cert.bonnet_gasket_specification,
        "bonnet_gasket_new": cert.bonnet_gasket_new,
        "bonnet_gasket_old": cert.bonnet_gasket_old,
        "bonnet_gasket_shop_fab": cert.bonnet_gasket_shop_fab,
        # Pressure tests
        "seat_test_us_hyd": cert.seat_test_us_hyd,
        "seat_test_us_pneumatic": cert.seat_test_us_pneumatic,
        "seat_test_us_pressure": cert.seat_test_us_pressure,
        "seat_test_us_result": cert.seat_test_us_result,
        "seat_test_ds_hyd": cert.seat_test_ds_hyd,
        "seat_test_ds_pneumatic": cert.seat_test_ds_pneumatic,
        "seat_test_ds_pressure": cert.seat_test_ds_pressure,
        "seat_test_ds_result": cert.seat_test_ds_result,
        "body_test_hyd": cert.body_test_hyd,
        "body_test_pneumatic": cert.body_test_pneumatic,
        "body_test_pressure": cert.body_test_pressure,
        "body_test_result": cert.body_test_result,
        # Ends
        "ends_distance": cert.ends_distance,
        "ends_built_up": cert.ends_built_up,
        "ends_machined": cert.ends_machined,
        # Personnel
        "reclaimed_by_name": cert.reclaimed_by_name,
        "reclaimed_by_pno": cert.reclaimed_by_pno,
        "checked_by_name": cert.checked_by_name,
        "checked_by_pno": cert.checked_by_pno,
        "witness_comments": cert.witness_comments,
        "witness_sign": cert.witness_sign,
        "approved_by_name": current_user.full_name,
        "special_note": cert.special_note,
        "digital_signature": cert.digital_signature,
        "digital_signature_date": str(cert.digital_signature_date) if cert.digital_signature_date else None,
        "signed_by_name": cert.signed_by_name
    }

    generate_ffc_certificate_pdf(cert_data, output_path=pdf_full_path)
    cert.pdf_path = pdf_full_path

    # Synchronize Job status to CERTIFICATE_ISSUED
    if cert.job:
        prev_job_status = cert.job.status
        cert.job.status = "CERTIFICATE_ISSUED"
        history = StatusHistory(
            job_id=cert.job.id,
            previous_status=prev_job_status,
            new_status="CERTIFICATE_ISSUED",
            changed_by_id=current_user.id,
            reason=f"Certificate {cert.certificate_number} officially issued"
        )
        db.add(history)

    record_audit_log(db, current_user, "ISSUE", "Certificate", str(cert.id), {"cert_no": cert.certificate_number})
    db.commit()
    db.refresh(cert)
    return cert

@router.get("/{cert_id}/pdf")
def download_certificate_pdf(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # If PDF is not yet saved to disk or was previewed, generate on-the-fly
    if not cert.pdf_path or not os.path.exists(cert.pdf_path):
        cert_data = {
            "certificate_number": cert.certificate_number,
            "identification_no": cert.identification_no,
            "certificate_date": str(cert.certificate_date),
            "area": cert.area,
            "notification_no": cert.notification_no or "",
            "valve_description": cert.valve_description,
            "form_reference": cert.form_reference,
            "annexure": cert.annexure,
            "form_ref_date": cert.form_ref_date,
            "status": cert.status,
            "revision_number": cert.revision_number,
            "body_seat_stellited": cert.body_seat_stellited,
            "body_seat_machined": cert.body_seat_machined,
            "body_seat_lapped": cert.body_seat_lapped,
            "gate_disc_plug_warehouse_code": cert.gate_disc_plug_warehouse_code,
            "gate_disc_plug_stellited": cert.gate_disc_plug_stellited,
            "gate_disc_plug_machined": cert.gate_disc_plug_machined,
            "gate_disc_plug_lapped": cert.gate_disc_plug_lapped,
            "back_seat_bushing_stellited": cert.back_seat_bushing_stellited,
            "back_seat_bushing_machined": cert.back_seat_bushing_machined,
            "back_seat_bushing_lapped": cert.back_seat_bushing_lapped,
            "back_seat_stem_stellited": cert.back_seat_stem_stellited,
            "back_seat_stem_machined": cert.back_seat_stem_machined,
            "back_seat_stem_lapped": cert.back_seat_stem_lapped,
            "stem_built_up": cert.stem_built_up,
            "stem_machined": cert.stem_machined,
            "stem_polish": cert.stem_polish,
            "gland_packing_warehouse_code": cert.gland_packing_warehouse_code,
            "gland_packing_specification": cert.gland_packing_specification,
            "gland_packing_comp_rpr": cert.gland_packing_comp_rpr,
            "gland_packing_partl_rpr": cert.gland_packing_partl_rpr,
            "bonnet_gasket_warehouse_code": cert.bonnet_gasket_warehouse_code,
            "bonnet_gasket_specification": cert.bonnet_gasket_specification,
            "bonnet_gasket_new": cert.bonnet_gasket_new,
            "bonnet_gasket_old": cert.bonnet_gasket_old,
            "bonnet_gasket_shop_fab": cert.bonnet_gasket_shop_fab,
            "seat_test_us_hyd": cert.seat_test_us_hyd,
            "seat_test_us_pneumatic": cert.seat_test_us_pneumatic,
            "seat_test_us_pressure": cert.seat_test_us_pressure,
            "seat_test_us_result": cert.seat_test_us_result,
            "seat_test_ds_hyd": cert.seat_test_ds_hyd,
            "seat_test_ds_pneumatic": cert.seat_test_ds_pneumatic,
            "seat_test_ds_pressure": cert.seat_test_ds_pressure,
            "seat_test_ds_result": cert.seat_test_ds_result,
            "body_test_hyd": cert.body_test_hyd,
            "body_test_pneumatic": cert.body_test_pneumatic,
            "body_test_pressure": cert.body_test_pressure,
            "body_test_result": cert.body_test_result,
            "ends_distance": cert.ends_distance,
            "ends_built_up": cert.ends_built_up,
            "ends_machined": cert.ends_machined,
            "reclaimed_by_name": cert.reclaimed_by_name,
            "reclaimed_by_pno": cert.reclaimed_by_pno,
            "checked_by_name": cert.checked_by_name,
            "checked_by_pno": cert.checked_by_pno,
            "witness_comments": cert.witness_comments,
            "witness_sign": cert.witness_sign,
            "special_note": cert.special_note,
            "digital_signature": cert.digital_signature,
            "digital_signature_date": str(cert.digital_signature_date) if cert.digital_signature_date else None,
            "signed_by_name": cert.signed_by_name
        }
        pdf_bytes = generate_ffc_certificate_pdf(cert_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={cert.certificate_number}.pdf"}
        )

    return FileResponse(
        path=cert.pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(cert.pdf_path)
    )

@router.post("/{cert_id}/revise", response_model=CertificateOut)
def revise_certificate(
    cert_id: int,
    req: CertificateReviseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "inspector"]))
):
    parent = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Original certificate not found")

    # Mark parent as SUPERSEDED
    parent.status = "SUPERSEDED"

    # Create new revision with incremented revision number
    new_rev = Certificate(
        certificate_number=parent.certificate_number,
        job_id=parent.job_id,
        identification_no=parent.identification_no,
        certificate_date=date.today(),
        area=parent.area,
        notification_no=parent.notification_no,
        valve_description=parent.valve_description,
        body_seat_stellited=parent.body_seat_stellited,
        body_seat_machined=parent.body_seat_machined,
        body_seat_lapped=parent.body_seat_lapped,
        gate_disc_plug_warehouse_code=parent.gate_disc_plug_warehouse_code,
        back_seat_bushing_stellited=parent.back_seat_bushing_stellited,
        back_seat_bushing_machined=parent.back_seat_bushing_machined,
        back_seat_bushing_lapped=parent.back_seat_bushing_lapped,
        back_seat_stem_stellited=parent.back_seat_stem_stellited,
        back_seat_stem_machined=parent.back_seat_stem_machined,
        back_seat_stem_lapped=parent.back_seat_stem_lapped,
        stem_built_up=parent.stem_built_up,
        stem_machined=parent.stem_machined,
        stem_polish=parent.stem_polish,
        gland_packing_warehouse_code=parent.gland_packing_warehouse_code,
        gland_packing_comp_rpr=parent.gland_packing_comp_rpr,
        gland_packing_partl_rpr=parent.gland_packing_partl_rpr,
        bonnet_gasket_warehouse_code=parent.bonnet_gasket_warehouse_code,
        bonnet_gasket_new=parent.bonnet_gasket_new,
        bonnet_gasket_old=parent.bonnet_gasket_old,
        bonnet_gasket_shop_fab=parent.bonnet_gasket_shop_fab,
        seat_test_us_hyd=parent.seat_test_us_hyd,
        seat_test_us_pneumatic=parent.seat_test_us_pneumatic,
        seat_test_us_pressure=parent.seat_test_us_pressure,
        seat_test_us_result=parent.seat_test_us_result,
        seat_test_ds_hyd=parent.seat_test_ds_hyd,
        seat_test_ds_pneumatic=parent.seat_test_ds_pneumatic,
        seat_test_ds_pressure=parent.seat_test_ds_pressure,
        seat_test_ds_result=parent.seat_test_ds_result,
        body_test_hyd=parent.body_test_hyd,
        body_test_pneumatic=parent.body_test_pneumatic,
        body_test_pressure=parent.body_test_pressure,
        body_test_result=parent.body_test_result,
        ends_distance=parent.ends_distance,
        ends_built_up=parent.ends_built_up,
        ends_machined=parent.ends_machined,
        reclaimed_by_name=parent.reclaimed_by_name,
        reclaimed_by_pno=parent.reclaimed_by_pno,
        checked_by_name=parent.checked_by_name,
        checked_by_pno=parent.checked_by_pno,
        witness_comments=parent.witness_comments,
        witness_sign=parent.witness_sign,
        special_note=parent.special_note,
        status="DRAFT",
        revision_number=parent.revision_number + 1,
        parent_certificate_id=parent.id,
        created_by_id=current_user.id
    )

    if req.changes:
        ch_dict = req.changes.model_dump(exclude_unset=True)
        for k, v in ch_dict.items():
            setattr(new_rev, k, v)

    db.add(new_rev)
    db.flush()
    record_audit_log(
        db, current_user, "REVISE", "Certificate", str(new_rev.id),
        {"cert_no": new_rev.certificate_number, "revision": new_rev.revision_number, "reason": req.reason}
    )
    db.commit()
    db.refresh(new_rev)
    return new_rev

# ----------------- AI / OCR Certificate Scanning & Auto-Registration -----------------

@router.post("/scan-extract")
async def scan_and_extract_certificate(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scan a certificate photo, run native OCR, and extract all technical and organizational fields."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty certificate image file")

    content_type = file.content_type or "image/jpeg"
    b64_img = base64.b64encode(content).decode("utf-8")
    preview_data_url = f"data:{content_type};base64,{b64_img}"

    raw_text = await extract_text_from_image_async(content)
    extracted_data = parse_certificate_text(raw_text, db)

    return {
        "success": True,
        "extracted_data": extracted_data,
        "raw_text": raw_text,
        "preview_url": preview_data_url,
        "file_name": file.filename
    }

@router.post("/scan-and-register")
async def scan_and_register_certificate(
    file: UploadFile = File(...),
    notification_no: Optional[str] = Form(None),
    valve_description: Optional[str] = Form(None),
    valve_tag_no: Optional[str] = Form(None),
    valve_serial_no: Optional[str] = Form(None),
    size: Optional[str] = Form(None),
    pressure_rating: Optional[str] = Form(None),
    source: Optional[str] = Form("PLANT_1"),
    plant_id: Optional[int] = Form(None),
    department_id: Optional[int] = Form(None),
    reclaimed_by_name: Optional[str] = Form(None),
    checked_by_name: Optional[str] = Form(None),
    seat_test_us_pressure: Optional[float] = Form(None),
    seat_test_ds_pressure: Optional[float] = Form(None),
    body_test_pressure: Optional[float] = Form(None),
    priority: Optional[str] = Form("NORMAL"),
    operation_categories: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scan a certificate photo, extract details, store the certificate image in backend documents,
    atomically create the ReclamationJob with unique VR tracking ID, and generate the Form QF-003-05-307
    Certificate with unique CERT number."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty certificate image file")

    # Run OCR extraction
    raw_text = await extract_text_from_image_async(content)
    parsed = parse_certificate_text(raw_text, db)

    # Apply overrides from form parameters if provided
    final_notification_no = notification_no or parsed.get("notification_no") or f"SCAN-{int(time.time())}"
    final_desc = valve_description or parsed.get("valve_description") or "Reclaimed Valve (Scanned from Form)"
    final_tag = valve_tag_no or parsed.get("valve_tag_no")
    final_serial = valve_serial_no or parsed.get("valve_serial_no")
    final_size = size or parsed.get("size")
    final_rating = pressure_rating or parsed.get("pressure_rating")
    final_source = source or parsed.get("source") or "PLANT_1"

    # Resolve Plant & Department
    final_plant_id = plant_id or parsed.get("plant_id")
    final_dept_id = department_id or parsed.get("department_id")

    if not final_plant_id:
        p1 = db.query(Plant).filter(Plant.code == final_source).first()
        if not p1:
            p1 = db.query(Plant).first()
        final_plant_id = p1.id if p1 else 1

    if not final_dept_id:
        dept = db.query(Department).filter(Department.plant_id == final_plant_id).first()
        final_dept_id = dept.id if dept else 1

    # Atomic Sequence Generation for Job
    tracking_id = generate_next_sequence_id(db, settings.DEFAULT_VR_PREFIX)

    new_job = ReclamationJob(
        tracking_id=tracking_id,
        source=final_source,
        plant_id=final_plant_id,
        department_id=final_dept_id,
        notification_no=final_notification_no,
        work_order_ref=parsed.get("work_order_ref") or f"WO-{final_notification_no}",
        valve_description=final_desc,
        valve_tag_no=final_tag,
        valve_serial_no=final_serial,
        size=final_size,
        pressure_rating=final_rating,
        valve_quantity=1,
        priority=priority or "NORMAL",
        operation_categories=operation_categories or parsed.get("operation_categories"),
        status="COMPLETED",
        created_by_id=current_user.id
    )
    db.add(new_job)
    db.flush()

    # Save uploaded certificate photo into documents
    timestamp_prefix = int(time.time() * 1000)
    clean_cert_filename = f"{new_job.tracking_id}_CERT_SCAN_{timestamp_prefix}_{file.filename}"
    file_dest = os.path.join(settings.DOCUMENTS_DIR, clean_cert_filename)
    with open(file_dest, "wb") as buffer:
        buffer.write(content)

    doc_attachment = DocumentAttachment(
        job_id=new_job.id,
        file_name=file.filename,
        file_path=file_dest,
        file_size=len(content),
        content_type=file.content_type or "image/jpeg",
        document_category="RECLAMATION_FORM",
        description="Original scanned paper certificate / work order",
        uploaded_by_id=current_user.id
    )
    db.add(doc_attachment)

    # Initial status history
    status_entry = StatusHistory(
        job_id=new_job.id,
        previous_status="NEW",
        new_status="COMPLETED",
        changed_by_id=current_user.id,
        reason="Direct registration and certificate generation via AI Document Scanner"
    )
    db.add(status_entry)

    # Generate atomic Certificate Number
    cert_no = generate_next_sequence_id(db, "CERT")

    final_seat_us = seat_test_us_pressure if seat_test_us_pressure is not None else parsed.get("seat_test_us_pressure")
    final_seat_ds = seat_test_ds_pressure if seat_test_ds_pressure is not None else parsed.get("seat_test_ds_pressure")
    final_body = body_test_pressure if body_test_pressure is not None else parsed.get("body_test_pressure")

    certificate = Certificate(
        job_id=new_job.id,
        certificate_number=cert_no,
        revision_number=0,
        identification_no=final_serial or final_tag or new_job.tracking_id,
        certificate_date=date.today(),
        area=new_job.department.name if new_job.department else "Workshop",
        notification_no=final_notification_no,
        valve_description=final_desc,
        body_seat_stellited=True,
        body_seat_machined=True,
        body_seat_lapped=True,
        seat_test_us_hyd=True if final_seat_us else False,
        seat_test_us_pressure=f"{int(final_seat_us) if float(final_seat_us).is_integer() else final_seat_us} PSI" if final_seat_us is not None else None,
        seat_test_us_result="PASS" if final_seat_us else "PENDING",
        seat_test_ds_hyd=True if final_seat_ds else False,
        seat_test_ds_pressure=f"{int(final_seat_ds) if float(final_seat_ds).is_integer() else final_seat_ds} PSI" if final_seat_ds is not None else None,
        seat_test_ds_result="PASS" if final_seat_ds else "PENDING",
        body_test_hyd=True if final_body else False,
        body_test_pressure=f"{int(final_body) if float(final_body).is_integer() else final_body} PSI" if final_body is not None else None,
        body_test_result="PASS" if final_body else "PENDING",
        reclaimed_by_name=reclaimed_by_name or parsed.get("reclaimed_by_name") or current_user.full_name,
        reclaimed_by_pno=parsed.get("reclaimed_by_p_no") or current_user.p_number or "P-1001",
        checked_by_name=checked_by_name or parsed.get("checked_by_name") or "Workshop Supervisor",
        checked_by_pno=parsed.get("checked_by_p_no") or "P-2001",
        status="ISSUED",
        created_by_id=current_user.id
    )
    db.add(certificate)
    db.flush()

    # Log pressure tests if present
    if final_seat_us:
        db.add(PressureTest(
            job_id=new_job.id,
            test_category="SEAT_TEST_US",
            test_method="HYDRAULIC",
            test_pressure=final_seat_us,
            pressure_unit="PSI",
            actual_result="PASS",
            inspector_id=current_user.id,
            inspector_name=current_user.full_name
        ))
    if final_body:
        db.add(PressureTest(
            job_id=new_job.id,
            test_category="BODY_TEST",
            test_method="HYDRAULIC",
            test_pressure=final_body,
            pressure_unit="PSI",
            actual_result="PASS",
            inspector_id=current_user.id,
            inspector_name=current_user.full_name
        ))

    record_audit_log(
        db, current_user, "AI_SCAN_REGISTER", "ReclamationJob", str(new_job.id),
        {
            "tracking_id": tracking_id,
            "cert_number": cert_no,
            "notification_no": final_notification_no,
            "filename": file.filename
        }
    )

    db.commit()
    db.refresh(new_job)
    db.refresh(certificate)

    return {
        "success": True,
        "job_id": new_job.id,
        "tracking_id": new_job.tracking_id,
        "certificate_id": certificate.id,
        "certificate_number": certificate.certificate_number,
        "status": new_job.status,
        "valve_description": new_job.valve_description,
        "notification_no": new_job.notification_no,
        "plant_name": new_job.plant.name if new_job.plant else "Plant 1",
        "department_name": new_job.department.name if new_job.department else "Ammonia",
        "message": f"Successfully registered job {new_job.tracking_id} and issued certificate {certificate.certificate_number} from scanned certificate."
    }

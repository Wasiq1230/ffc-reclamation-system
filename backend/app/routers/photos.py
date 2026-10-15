import os
import time
import base64
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.job import ReclamationJob
from backend.app.models.technical import ValvePhoto
from backend.app.models.user import User
from backend.app.models.organization import Department
from backend.app.schemas.technical import ValvePhotoOut
from backend.app.services.auth import get_current_user, require_roles
from backend.app.services.audit_service import record_audit_log

router = APIRouter(tags=["Valve Photos & Visual Work Evidence"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}
MAX_PHOTO_SIZE = 25 * 1024 * 1024  # 25 MB

def format_photo_out(photo: ValvePhoto) -> dict:
    return {
        "id": photo.id,
        "job_id": photo.job_id,
        "stage": photo.stage,
        "title": photo.title,
        "work_description": photo.work_description,
        "performed_by_id": photo.performed_by_id,
        "performed_by_name": photo.performed_by_name or (photo.performed_by.full_name if photo.performed_by else "Unassigned Technician"),
        "department_id": photo.department_id,
        "department_name": photo.department_name or (photo.department.name if photo.department else "Fabrication Shop"),
        "file_name": photo.file_name,
        "file_size": photo.file_size,
        "content_type": photo.content_type,
        "image_data_url": photo.image_data_url,
        "taken_at": photo.taken_at,
        "uploaded_by_id": photo.uploaded_by_id,
        "created_at": photo.created_at,
        "url": f"/api/photos/{photo.id}/file",
        "tracking_id": photo.job.tracking_id if photo.job else f"JOB-{photo.job_id}",
        "valve_description": photo.job.valve_description if photo.job else "",
        "valve_tag_no": photo.job.valve_tag_no if photo.job else "",
        "job_source": photo.job.source if photo.job else "",
    }

@router.post("/jobs/{job_id}/photos", response_model=ValvePhotoOut)
async def upload_valve_photo(
    job_id: int,
    file: UploadFile = File(...),
    stage: Optional[str] = Form(None),
    photo_stage: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    work_description: Optional[str] = Form(None),
    work_done_notes: Optional[str] = Form(None),
    performed_by_id: Optional[int] = Form(None),
    performed_by_name: Optional[str] = Form(None),
    department_id: Optional[int] = Form(None),
    department_name: Optional[str] = Form(None),
    taken_at: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop", "technician", "inspector"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Reclamation job not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed image formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    final_stage = (stage or photo_stage or "BEFORE").upper()
    final_title = title or caption or f"{final_stage.capitalize()} Work on Valve"
    final_work_desc = work_description or work_done_notes or "Valve photographic inspection record"

    # Resolve technician name
    resolved_tech_name = performed_by_name
    if performed_by_id:
        tech_user = db.query(User).filter(User.id == performed_by_id).first()
        if tech_user:
            resolved_tech_name = tech_user.full_name
    if not resolved_tech_name:
        resolved_tech_name = current_user.full_name

    # Resolve department name
    resolved_dept_name = department_name
    if department_id:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if dept:
            resolved_dept_name = dept.name
    if not resolved_dept_name:
        if job.department:
            resolved_dept_name = job.department.name
        else:
            resolved_dept_name = "Fabrication Shop"

    # Secure storage file path
    timestamp_prefix = int(time.time() * 1000)
    safe_clean_filename = f"{job.tracking_id}_{final_stage}_{timestamp_prefix}_{file.filename}"
    file_dest = os.path.join(settings.PHOTOS_DIR, safe_clean_filename)

    file_size = 0
    with open(file_dest, "wb") as buffer:
        content = await file.read()
        file_size = len(content)
        if file_size > MAX_PHOTO_SIZE:
            if os.path.exists(file_dest):
                os.remove(file_dest)
            raise HTTPException(status_code=400, detail="Image file exceeds maximum permitted size of 25MB")
        buffer.write(content)

    # Generate Base64 Data URL for instant, reliable rendering & storage
    content_type_str = file.content_type or "image/jpeg"
    b64_data_url = f"data:{content_type_str};base64,{base64.b64encode(content).decode('utf-8')}"

    # Parse taken_at if provided
    dt_taken = datetime.utcnow()
    if taken_at:
        try:
            dt_taken = datetime.fromisoformat(taken_at.replace("Z", "+00:00"))
        except Exception:
            try:
                dt_taken = datetime.strptime(taken_at, "%Y-%m-%d")
            except Exception:
                dt_taken = datetime.utcnow()

    valve_photo = ValvePhoto(
        job_id=job_id,
        stage=final_stage,
        title=final_title,
        work_description=final_work_desc,
        performed_by_id=performed_by_id or current_user.id,
        performed_by_name=resolved_tech_name,
        department_id=department_id,
        department_name=resolved_dept_name,
        file_name=file.filename,
        file_path=file_dest,
        file_size=file_size,
        content_type=content_type_str,
        image_data_url=b64_data_url,
        taken_at=dt_taken,
        uploaded_by_id=current_user.id
    )

    db.add(valve_photo)
    db.flush()

    record_audit_log(
        db, current_user, "UPLOAD_PHOTO", "ValvePhoto", str(valve_photo.id),
        {
            "job_id": job_id,
            "tracking_id": job.tracking_id,
            "stage": valve_photo.stage,
            "work_description": valve_photo.work_description,
            "performed_by": valve_photo.performed_by_name,
            "department": valve_photo.department_name
        }
    )
    db.commit()
    db.refresh(valve_photo)

    return format_photo_out(valve_photo)

@router.get("/jobs/{job_id}/photos", response_model=List[ValvePhotoOut])
def get_valve_photos(
    job_id: int,
    stage: Optional[str] = Query(None, description="Filter by BEFORE or AFTER stage"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Reclamation job not found")

    query = db.query(ValvePhoto).filter(ValvePhoto.job_id == job_id)
    if stage:
        query = query.filter(ValvePhoto.stage == stage.upper())

    photos = query.order_by(ValvePhoto.created_at.desc()).all()
    return [format_photo_out(p) for p in photos]

@router.get("/photos", response_model=List[ValvePhotoOut])
def get_all_valve_photos(
    stage: Optional[str] = Query(None, description="Filter by BEFORE or AFTER stage"),
    job_id: Optional[int] = Query(None, description="Filter by Job ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ValvePhoto).options(
        joinedload(ValvePhoto.performed_by),
        joinedload(ValvePhoto.department),
        joinedload(ValvePhoto.job)
    )
    if stage:
        query = query.filter(ValvePhoto.stage == stage.upper())
    if job_id:
        query = query.filter(ValvePhoto.job_id == job_id)

    photos = query.order_by(ValvePhoto.created_at.desc()).limit(150).all()
    return [format_photo_out(p) for p in photos]

@router.get("/photos/{photo_id}/file")
def get_photo_file(
    photo_id: int,
    db: Session = Depends(get_db)
):
    photo = db.query(ValvePhoto).filter(ValvePhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Valve photo record not found")

    if not os.path.exists(photo.file_path):
        raise HTTPException(status_code=404, detail="Photo file not found on disk")

    return FileResponse(
        path=photo.file_path,
        media_type=photo.content_type,
        filename=photo.file_name,
        headers={"Content-Disposition": f'inline; filename="{photo.file_name}"'}
    )

@router.delete("/photos/{photo_id}")
def delete_valve_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop"]))
):
    photo = db.query(ValvePhoto).filter(ValvePhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo record not found")

    # Remove underlying file if exists
    if os.path.exists(photo.file_path):
        try:
            os.remove(photo.file_path)
        except Exception:
            pass

    record_audit_log(
        db, current_user, "DELETE_PHOTO", "ValvePhoto", str(photo.id),
        {"job_id": photo.job_id, "file_name": photo.file_name, "stage": photo.stage}
    )

    db.delete(photo)
    db.commit()
    return {"message": "Valve photo deleted successfully", "id": photo_id}

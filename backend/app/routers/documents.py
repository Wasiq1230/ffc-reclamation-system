import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.job import ReclamationJob
from backend.app.models.document import DocumentAttachment
from backend.app.models.user import User
from backend.app.schemas.document import DocumentOut
from backend.app.services.auth import get_current_user, require_roles
from backend.app.services.audit_service import record_audit_log

router = APIRouter(prefix="/documents", tags=["Documents & Attachments"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx", ".txt"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("/upload/{job_id}", response_model=DocumentOut)
async def upload_document(
    job_id: int,
    file: UploadFile = File(...),
    category: str = Form("OTHER"),
    description: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop", "technician", "inspector"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not permitted")

    # Secure storage filename
    safe_filename = f"{job.tracking_id}_{int(os.times().elapsed*1000)}_{file.filename}"
    file_dest = os.path.join(settings.DOCUMENTS_DIR, safe_filename)

    file_size = 0
    with open(file_dest, "wb") as buffer:
        content = await file.read()
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            os.remove(file_dest)
            raise HTTPException(status_code=400, detail="File exceeds maximum permitted size (25MB)")
        buffer.write(content)

    doc = DocumentAttachment(
        job_id=job_id,
        file_name=file.filename,
        file_path=file_dest,
        file_size=file_size,
        content_type=file.content_type or "application/octet-stream",
        document_category=category,
        description=description,
        uploaded_by_id=current_user.id
    )
    db.add(doc)
    db.flush()
    record_audit_log(db, current_user, "UPLOAD", "DocumentAttachment", str(doc.id), {"filename": doc.file_name, "category": category})
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/download/{doc_id}")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(DocumentAttachment).filter(DocumentAttachment.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Underlying document file not found on disk")

    return FileResponse(
        path=doc.file_path,
        media_type=doc.content_type,
        filename=doc.file_name
    )

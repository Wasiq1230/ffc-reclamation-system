from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models.job import ReclamationJob
from backend.app.models.technical import InspectionRecord, WorkEntry, MaterialPart, PressureTest
from backend.app.models.user import User
from backend.app.schemas.technical import (
    InspectionCreate, InspectionOut,
    WorkEntryCreate, WorkEntryOut,
    MaterialPartCreate, MaterialPartOut,
    PressureTestCreate, PressureTestOut
)
from backend.app.services.auth import get_current_user, require_roles
from backend.app.services.audit_service import record_audit_log

router = APIRouter(prefix="/jobs/{job_id}", tags=["Technical Operations & Testing"])

# ----------------- Inspections -----------------
@router.post("/inspections", response_model=InspectionOut)
def add_inspection(
    job_id: int,
    insp_in: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop", "inspector", "technician"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    inspection = InspectionRecord(
        job_id=job_id,
        inspector_id=insp_in.inspector_id or current_user.id,
        inspector_name=insp_in.inspector_name or current_user.full_name,
        **insp_in.model_dump(exclude={"inspector_id", "inspector_name"})
    )
    db.add(inspection)
    db.flush()
    record_audit_log(db, current_user, "CREATE", "InspectionRecord", str(inspection.id), {"type": inspection.inspection_type})
    db.commit()
    db.refresh(inspection)
    return inspection

# ----------------- Work Entries -----------------
@router.post("/work-entries", response_model=WorkEntryOut)
def add_work_entry(
    job_id: int,
    work_in: WorkEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "technician", "fab_shop"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    entry = WorkEntry(
        job_id=job_id,
        technician_id=work_in.technician_id or current_user.id,
        technician_name=work_in.technician_name or current_user.full_name,
        **work_in.model_dump(exclude={"technician_id", "technician_name"})
    )
    db.add(entry)
    db.flush()
    record_audit_log(db, current_user, "CREATE", "WorkEntry", str(entry.id), {"operation": entry.operation_type})
    db.commit()
    db.refresh(entry)
    return entry

# ----------------- Materials & Parts -----------------
@router.post("/materials", response_model=MaterialPartOut)
def add_material_part(
    job_id: int,
    mat_in: MaterialPartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "technician", "fab_shop"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    part = MaterialPart(job_id=job_id, **mat_in.model_dump())
    db.add(part)
    db.flush()
    record_audit_log(db, current_user, "CREATE", "MaterialPart", str(part.id), {"part_name": part.part_name, "w_code": part.warehouse_code})
    db.commit()
    db.refresh(part)
    return part

# ----------------- Pressure Tests -----------------
@router.post("/tests", response_model=PressureTestOut)
def record_pressure_test(
    job_id: int,
    test_in: PressureTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "inspector", "technician"]))
):
    job = db.query(ReclamationJob).filter(ReclamationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    test_rec = PressureTest(
        job_id=job_id,
        inspector_id=test_in.inspector_id or current_user.id,
        inspector_name=test_in.inspector_name or current_user.full_name,
        **test_in.model_dump(exclude={"inspector_id", "inspector_name"})
    )
    db.add(test_rec)
    db.flush()
    record_audit_log(
        db, current_user, "CREATE", "PressureTest", str(test_rec.id),
        {"category": test_rec.test_category, "pressure": test_rec.test_pressure, "result": test_rec.actual_result}
    )
    db.commit()
    db.refresh(test_rec)
    return test_rec

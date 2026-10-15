from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.organization import Plant, Department, ExternalCustomer
from backend.app.models.user import User
from backend.app.schemas.organization import (
    PlantOut,
    DepartmentOut,
    ExternalCustomerCreate,
    ExternalCustomerUpdate,
    ExternalCustomerOut,
)
from backend.app.services.auth import get_current_user, require_roles
from backend.app.services.audit_service import record_audit_log

router = APIRouter(prefix="/org", tags=["Plants, Departments & External Customers"])

@router.get("/plants", response_model=List[PlantOut])
def list_plants(db: Session = Depends(get_db)):
    """Lists all active plants with their associated departments."""
    return db.query(Plant).filter(Plant.is_active == True).all()

@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(plant_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Lists departments. If plant_id is provided, filters strictly by that plant."""
    query = db.query(Department).filter(Department.is_active == True)
    if plant_id is not None:
        query = query.filter(Department.plant_id == plant_id)
    return query.order_by(Department.name).all()

@router.get("/validate-association")
def validate_plant_department_association(
    plant_id: int,
    department_id: int,
    db: Session = Depends(get_db)
):
    """
    Validates that the specified department belongs strictly to the specified plant.
    Prevents cross-plant contamination (e.g. Plant 1 using Plant 2 Ammonia).
    """
    dept = db.query(Department).filter(
        Department.id == department_id,
        Department.plant_id == plant_id,
        Department.is_active == True
    ).first()
    if not dept:
        raise HTTPException(
            status_code=400,
            detail=f"Validation failed: Department ID {department_id} does not belong to Plant ID {plant_id}"
        )
    return {"valid": True, "plant_id": plant_id, "department_id": department_id, "department_name": dept.name}

# ----------------- External Customers -----------------
@router.get("/customers", response_model=List[ExternalCustomerOut])
def list_external_customers(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(ExternalCustomer)
    if not include_inactive:
        query = query.filter(ExternalCustomer.is_active == True)
    return query.order_by(ExternalCustomer.customer_name).all()

@router.post("/customers", response_model=ExternalCustomerOut)
def create_external_customer(
    cust_in: ExternalCustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop"]))
):
    new_cust = ExternalCustomer(**cust_in.model_dump())
    db.add(new_cust)
    db.flush()
    record_audit_log(
        db, current_user, "CREATE", "ExternalCustomer", str(new_cust.id),
        {"name": new_cust.customer_name}
    )
    db.commit()
    db.refresh(new_cust)
    return new_cust

@router.put("/customers/{cust_id}", response_model=ExternalCustomerOut)
def update_external_customer(
    cust_id: int,
    cust_in: ExternalCustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "fab_shop"]))
):
    cust = db.query(ExternalCustomer).filter(ExternalCustomer.id == cust_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="External customer not found")

    update_data = cust_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(cust, field, val)

    record_audit_log(
        db, current_user, "UPDATE", "ExternalCustomer", str(cust.id),
        {"updated_fields": list(update_data.keys())}
    )
    db.commit()
    db.refresh(cust)
    return cust

@router.delete("/customers/{cust_id}")
def deactivate_external_customer(
    cust_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    cust = db.query(ExternalCustomer).filter(ExternalCustomer.id == cust_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="External customer not found")
    cust.is_active = False
    record_audit_log(db, current_user, "DEACTIVATE", "ExternalCustomer", str(cust.id))
    db.commit()
    return {"message": "External customer deactivated successfully without deleting historical records"}

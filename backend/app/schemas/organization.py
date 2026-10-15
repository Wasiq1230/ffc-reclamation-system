from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class DepartmentOut(BaseModel):
    id: int
    plant_id: int
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class PlantOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool
    departments: List[DepartmentOut] = []

    class Config:
        from_attributes = True

class ExternalCustomerBase(BaseModel):
    customer_name: str
    plant_facility_name: Optional[str] = None
    department_operating_area: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    reference_number: Optional[str] = None
    is_active: bool = True

class ExternalCustomerCreate(ExternalCustomerBase):
    pass

class ExternalCustomerUpdate(BaseModel):
    customer_name: Optional[str] = None
    plant_facility_name: Optional[str] = None
    department_operating_area: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    reference_number: Optional[str] = None
    is_active: Optional[bool] = None

class ExternalCustomerOut(ExternalCustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

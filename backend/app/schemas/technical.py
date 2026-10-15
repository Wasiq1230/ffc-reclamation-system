from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel

# ----------------- Inspection -----------------
class InspectionBase(BaseModel):
    inspection_type: str = "INITIAL"
    reported_problem: Optional[str] = None
    observed_damage: Optional[str] = None
    initial_condition: Optional[str] = None
    findings: Optional[str] = None
    recommended_work: Optional[str] = None
    inspection_date: date = date.today()
    inspector_id: Optional[int] = None
    inspector_name: Optional[str] = None

class InspectionCreate(InspectionBase):
    pass

class InspectionOut(InspectionBase):
    id: int
    job_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Work Entry -----------------
class WorkEntryBase(BaseModel):
    operation_type: str
    operation_categories: Optional[str] = None
    details: str
    technician_id: Optional[int] = None
    technician_name: Optional[str] = None
    hours_spent: float = 0.0
    operation_date: date = date.today()
    remarks: Optional[str] = None

class WorkEntryCreate(WorkEntryBase):
    pass

class WorkEntryOut(WorkEntryBase):
    id: int
    job_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Materials -----------------
class MaterialPartBase(BaseModel):
    part_name: str
    description: Optional[str] = None
    warehouse_code: Optional[str] = None
    quantity: float = 1.0
    unit: str = "EA"
    status: str = "REPLACED"
    remarks: Optional[str] = None

class MaterialPartCreate(MaterialPartBase):
    pass

class MaterialPartOut(MaterialPartBase):
    id: int
    job_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Pressure Test -----------------
class PressureTestBase(BaseModel):
    test_category: str  # SEAT_TEST_US, SEAT_TEST_DS, BODY_TEST
    test_method: str = "HYDRAULIC"  # HYDRAULIC, PNEUMATIC
    test_pressure: float
    pressure_unit: str = "PSI"
    actual_result: str = "PENDING"  # PASS, FAIL, PENDING, NOT_PERFORMED
    test_date: date = date.today()
    test_duration_minutes: Optional[int] = None
    inspector_id: Optional[int] = None
    inspector_name: Optional[str] = None
    witness_name: Optional[str] = None
    remarks: Optional[str] = None

class PressureTestCreate(PressureTestBase):
    pass

class PressureTestOut(PressureTestBase):
    id: int
    job_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Valve Before/After Photos -----------------
class ValvePhotoBase(BaseModel):
    stage: str = "BEFORE"  # "BEFORE" or "AFTER"
    title: Optional[str] = None
    work_description: str
    performed_by_id: Optional[int] = None
    performed_by_name: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    image_data_url: Optional[str] = None
    taken_at: Optional[datetime] = None

class ValvePhotoCreate(ValvePhotoBase):
    pass

class ValvePhotoOut(ValvePhotoBase):
    id: int
    job_id: int
    file_name: str
    file_size: int
    content_type: str
    uploaded_by_id: Optional[int] = None
    created_at: datetime
    url: Optional[str] = None
    tracking_id: Optional[str] = None
    valve_description: Optional[str] = None
    valve_tag_no: Optional[str] = None
    job_source: Optional[str] = None

    class Config:
        from_attributes = True


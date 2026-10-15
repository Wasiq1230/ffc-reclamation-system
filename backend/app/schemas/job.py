from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from backend.app.schemas.technical import InspectionOut, WorkEntryOut, MaterialPartOut, PressureTestOut, ValvePhotoOut
from backend.app.schemas.certificate import CertificateOut
from backend.app.schemas.document import DocumentOut
from backend.app.schemas.financial import FinancialOut

class JobBase(BaseModel):
    source: str  # PLANT_1, PLANT_2, EXTERNAL
    plant_id: Optional[int] = None
    department_id: Optional[int] = None
    external_customer_id: Optional[int] = None
    notification_no: Optional[str] = None
    work_order_ref: Optional[str] = None
    priority: str = "NORMAL"
    operation_categories: Optional[str] = None  # JSON string or comma-separated categories
    assigned_technician_id: Optional[int] = None
    date_received: date = date.today()
    required_completion_date: Optional[date] = None
    valve_serial_no: Optional[str] = None
    valve_tag_no: Optional[str] = None
    valve_description: str
    valve_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    size: Optional[str] = None
    pressure_rating: Optional[str] = None
    valve_quantity: int = 1
    valve_material: Optional[str] = None
    process_service_details: Optional[str] = None
    additional_technical_desc: Optional[str] = None
    general_remarks: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    source: Optional[str] = None
    plant_id: Optional[int] = None
    department_id: Optional[int] = None
    external_customer_id: Optional[int] = None
    notification_no: Optional[str] = None
    work_order_ref: Optional[str] = None
    priority: Optional[str] = None
    operation_categories: Optional[str] = None
    assigned_technician_id: Optional[int] = None
    date_received: Optional[date] = None
    required_completion_date: Optional[date] = None
    valve_serial_no: Optional[str] = None
    valve_tag_no: Optional[str] = None
    valve_description: Optional[str] = None
    valve_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    size: Optional[str] = None
    pressure_rating: Optional[str] = None
    valve_quantity: Optional[int] = None
    valve_material: Optional[str] = None
    process_service_details: Optional[str] = None
    additional_technical_desc: Optional[str] = None
    general_remarks: Optional[str] = None
    hold_reason: Optional[str] = None
    delivery_date: Optional[datetime] = None
    delivery_recipient: Optional[str] = None
    delivery_acknowledgment: Optional[str] = None

class StatusUpdate(BaseModel):
    new_status: str
    reason: Optional[str] = None

class StatusHistoryOut(BaseModel):
    id: int
    previous_status: str
    new_status: str
    changed_by_id: int
    changed_by_name: Optional[str] = None
    timestamp: datetime
    reason: Optional[str] = None

    class Config:
        from_attributes = True

class JobOut(JobBase):
    id: int
    tracking_id: str
    registration_date: datetime
    status: str
    is_archived: bool
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    
    # Denormalized / resolved helper fields
    plant_name: Optional[str] = None
    department_name: Optional[str] = None
    customer_name: Optional[str] = None
    technician_name: Optional[str] = None
    certificate_status: Optional[str] = None
    certificate_id: Optional[int] = None

    class Config:
        from_attributes = True

class JobDetailOut(JobOut):
    hold_reason: Optional[str] = None
    delivery_date: Optional[datetime] = None
    delivery_recipient: Optional[str] = None
    delivery_acknowledgment: Optional[str] = None
    
    inspections: List[InspectionOut] = []
    work_entries: List[WorkEntryOut] = []
    materials: List[MaterialPartOut] = []
    tests: List[PressureTestOut] = []
    certificates: List[CertificateOut] = []
    documents: List[DocumentOut] = []
    photos: List[ValvePhotoOut] = []
    financial_record: Optional[FinancialOut] = None
    status_history: List[StatusHistoryOut] = []

    class Config:
        from_attributes = True

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

class FinancialBase(BaseModel):
    quoted_charges: Decimal = Decimal("0.00")
    approved_charges: Decimal = Decimal("0.00")
    actual_charges: Decimal = Decimal("0.00")
    currency: str = "PKR"
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    payments_received: Decimal = Decimal("0.00")
    payment_reference: Optional[str] = None
    payment_date: Optional[date] = None
    remarks: Optional[str] = None

class FinancialCreate(FinancialBase):
    job_id: int

class FinancialUpdate(BaseModel):
    quoted_charges: Optional[Decimal] = None
    approved_charges: Optional[Decimal] = None
    actual_charges: Optional[Decimal] = None
    currency: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    payments_received: Optional[Decimal] = None
    payment_reference: Optional[str] = None
    payment_date: Optional[date] = None
    remarks: Optional[str] = None

class FinancialOut(FinancialBase):
    id: int
    job_id: int
    outstanding_balance: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FinancialListItemOut(BaseModel):
    id: Optional[int] = None
    job_id: int
    tracking_id: str
    valve_description: str
    valve_tag_no: Optional[str] = None
    valve_serial_no: Optional[str] = None
    priority: str = "NORMAL"
    source: str
    plant_name: Optional[str] = None
    department_name: Optional[str] = None
    customer_name: Optional[str] = None
    notification_no: Optional[str] = None
    job_status: str

    # Financial fields
    has_financial_record: bool = False
    quoted_charges: Decimal = Decimal("0.00")
    approved_charges: Decimal = Decimal("0.00")
    actual_charges: Decimal = Decimal("0.00")
    currency: str = "PKR"
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    payments_received: Decimal = Decimal("0.00")
    payment_reference: Optional[str] = None
    payment_date: Optional[date] = None
    outstanding_balance: Decimal = Decimal("0.00")
    remarks: Optional[str] = None
    finance_status: str
    finance_status_label: str

    # Certificate fields
    certificate_status: str
    certificate_status_label: str
    certificate_id: Optional[int] = None
    certificate_number: Optional[str] = None
    certificate_workflow_status: Optional[str] = None
    certificate_tooltip: str

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FinancialSummaryOut(BaseModel):
    total_records: int = 0
    total_active_commercials: int = 0
    total_jobs: int = 0
    total_quoted: Decimal = Decimal("0.00")
    total_approved: Decimal = Decimal("0.00")
    total_invoiced: Decimal = Decimal("0.00")
    total_received: Decimal = Decimal("0.00")
    total_outstanding: Decimal = Decimal("0.00")

class FinancialListResponse(BaseModel):
    items: List[FinancialListItemOut]
    total: int
    summary: FinancialSummaryOut

from typing import List, Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel

class StatusCounts(BaseModel):
    received: int = 0
    registered: int = 0
    in_progress: int = 0
    awaiting_parts: int = 0
    testing: int = 0
    completed: int = 0
    certificate_issued: int = 0
    ready_for_delivery: int = 0
    delivered: int = 0
    on_hold: int = 0
    cancelled: int = 0

class DepartmentMetric(BaseModel):
    department_id: int
    department_name: str
    department_code: str
    plant_id: int
    plant_name: str
    total_jobs: int
    total_valve_qty: int
    completed_jobs: int
    in_progress_jobs: int
    pending_jobs: int
    certificates_issued: int
    certificates_pending: int
    monthly_jobs: Dict[str, int] = {}

class PlantMetric(BaseModel):
    plant_id: int
    plant_name: str
    plant_code: str
    total_jobs: int
    total_valve_qty: int
    completed_jobs: int
    in_progress_jobs: int
    pending_jobs: int
    certificates_issued: int
    certificates_pending: int
    departments: List[DepartmentMetric] = []
    monthly_jobs: Dict[str, int] = {}

class ExternalCustomerMetric(BaseModel):
    customer_id: int
    customer_name: str
    plant_facility_name: Optional[str] = None
    total_jobs: int
    total_valve_qty: int
    completed_jobs: int
    in_progress_jobs: int
    certificates_issued: int
    total_charges: Decimal = Decimal("0.00")
    outstanding_balance: Decimal = Decimal("0.00")

class ExternalMetricSummary(BaseModel):
    total_jobs: int
    total_valve_qty: int
    completed_jobs: int
    in_progress_jobs: int
    certificates_issued: int
    customers: List[ExternalCustomerMetric] = []
    monthly_jobs: Dict[str, int] = {}

class FinancialSummaryMetric(BaseModel):
    total_quoted: Decimal = Decimal("0.00")
    total_approved: Decimal = Decimal("0.00")
    total_actual: Decimal = Decimal("0.00")
    total_received: Decimal = Decimal("0.00")
    total_outstanding: Decimal = Decimal("0.00")

class DashboardMetricsOut(BaseModel):
    total_jobs: int
    total_valve_quantity: int
    jobs_received: int
    jobs_in_progress: int
    jobs_awaiting_parts_or_approval: int
    jobs_in_testing: int
    jobs_completed: int
    jobs_certificates_issued: int
    jobs_certificates_pending: int
    jobs_ready_for_delivery: int
    jobs_delivered: int
    jobs_on_hold: int
    jobs_overdue: int
    external_jobs_count: int
    ffc_plant1_total: int
    ffc_plant2_total: int
    status_breakdown: Dict[str, int]
    monthly_trend: Dict[str, int]
    plant1_metric: PlantMetric
    plant2_metric: PlantMetric
    external_metric: ExternalMetricSummary
    financial_summary: Optional[FinancialSummaryMetric] = None

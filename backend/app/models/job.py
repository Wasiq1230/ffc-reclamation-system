from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ReclamationJob(Base):
    __tablename__ = "reclamation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "FAB-2026-000001"
    
    # Registration & Receipt
    registration_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_received = Column(Date, default=date.today, nullable=False)
    
    # Source & Organization
    source = Column(String(30), nullable=False, index=True)  # "PLANT_1", "PLANT_2", "EXTERNAL"
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True, index=True)
    external_customer_id = Column(Integer, ForeignKey("external_customers.id"), nullable=True, index=True)
    
    # Work Order & Notifications
    notification_no = Column(String(100), index=True, nullable=True)
    work_order_ref = Column(String(100), nullable=True)
    priority = Column(String(20), default="NORMAL", nullable=False)  # NORMAL, HIGH, URGENT, EMERGENCY, LOW
    operation_categories = Column(Text, nullable=True)  # JSON or comma-separated list of selected and custom operation categories
    
    # Workflow Status
    # Statuses: RECEIVED, REGISTERED, INSPECTION_IN_PROGRESS, AWAITING_APPROVAL_PARTS, 
    # RECLAMATION_IN_PROGRESS, TESTING_QUALITY_INSPECTION, REWORK_REQUIRED, 
    # COMPLETED, CERTIFICATE_ISSUED, READY_FOR_DELIVERY, DELIVERED, ON_HOLD, CANCELLED
    status = Column(String(40), default="RECEIVED", nullable=False, index=True)
    assigned_technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    required_completion_date = Column(Date, nullable=True)
    
    # Valve Identification
    valve_serial_no = Column(String(100), index=True, nullable=True)
    valve_tag_no = Column(String(100), index=True, nullable=True)
    valve_description = Column(String(255), nullable=False)
    valve_type = Column(String(100), nullable=True)  # Gate, Globe, Check, Ball, Butterfly, Plug, Control, Safety, etc.
    manufacturer = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    size = Column(String(50), nullable=True)  # e.g. 2", 4", 6"
    pressure_rating = Column(String(50), nullable=True)  # e.g. 150#, 300#, 600#
    valve_quantity = Column(Integer, default=1, nullable=False)
    valve_material = Column(String(100), nullable=True)
    process_service_details = Column(String(255), nullable=True)
    additional_technical_desc = Column(Text, nullable=True)
    
    # Remarks and Exceptions
    general_remarks = Column(Text, nullable=True)
    hold_reason = Column(Text, nullable=True)
    
    # Delivery
    delivery_date = Column(DateTime, nullable=True)
    delivery_recipient = Column(String(100), nullable=True)
    delivery_acknowledgment = Column(Text, nullable=True)
    
    # Metadata & Auditing
    is_archived = Column(Boolean, default=False, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    plant = relationship("Plant", back_populates="jobs")
    department = relationship("Department", back_populates="jobs")
    external_customer = relationship("ExternalCustomer", back_populates="jobs")
    creator = relationship("User", back_populates="created_jobs", foreign_keys=[created_by_id])
    assigned_technician = relationship("User", back_populates="assigned_jobs", foreign_keys=[assigned_technician_id])
    
    status_history = relationship("StatusHistory", back_populates="job", cascade="all, delete-orphan", order_by="desc(StatusHistory.timestamp)")
    assignments = relationship("JobAssignment", back_populates="job", cascade="all, delete-orphan")
    inspections = relationship("InspectionRecord", back_populates="job", cascade="all, delete-orphan")
    work_entries = relationship("WorkEntry", back_populates="job", cascade="all, delete-orphan")
    materials = relationship("MaterialPart", back_populates="job", cascade="all, delete-orphan")
    tests = relationship("PressureTest", back_populates="job", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="job", cascade="all, delete-orphan")
    documents = relationship("DocumentAttachment", back_populates="job", cascade="all, delete-orphan")
    photos = relationship("ValvePhoto", back_populates="job", cascade="all, delete-orphan", order_by="desc(ValvePhoto.created_at)")
    financial_record = relationship("FinancialRecord", back_populates="job", uselist=False, cascade="all, delete-orphan")

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(40), nullable=False)
    new_status = Column(String(40), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    reason = Column(Text, nullable=True)

    job = relationship("ReclamationJob", back_populates="status_history")
    user = relationship("User", back_populates="status_changes")

class JobAssignment(Base):
    __tablename__ = "job_assignments"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_in_job = Column(String(50), nullable=False)  # Lead Technician, Machinist, Welder, Helper
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    job = relationship("ReclamationJob", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id])

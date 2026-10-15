from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text, BigInteger
from sqlalchemy.orm import relationship
from backend.app.database import Base

class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    inspection_type = Column(String(50), default="INITIAL", nullable=False)  # INITIAL, RECLAMATION, FINAL
    reported_problem = Column(Text, nullable=True)
    observed_damage = Column(Text, nullable=True)
    initial_condition = Column(String(100), nullable=True)  # Worn, Corroded, Leaking, Seized, Damaged
    findings = Column(Text, nullable=True)
    recommended_work = Column(Text, nullable=True)
    inspection_date = Column(Date, default=date.today, nullable=False)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    inspector_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("ReclamationJob", back_populates="inspections")
    inspector = relationship("User", foreign_keys=[inspector_id])

class WorkEntry(Base):
    __tablename__ = "work_entries"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_type = Column(String(200), nullable=False)  # Seat reclamation, Machining, Lapping, Stelliting, Stem work, Gland packing, Gasket replacement, Gate/disc/plug work, Back-seat work, Ends repair, Other / Combined
    operation_categories = Column(Text, nullable=True)  # JSON or comma-separated list of selected and custom operation categories
    details = Column(Text, nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    technician_name = Column(String(100), nullable=True)
    hours_spent = Column(Float, default=0.0, nullable=True)
    operation_date = Column(Date, default=date.today, nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("ReclamationJob", back_populates="work_entries")
    technician = relationship("User", foreign_keys=[technician_id])

class MaterialPart(Base):
    __tablename__ = "materials_parts"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    part_name = Column(String(150), nullable=False)
    description = Column(String(255), nullable=True)
    warehouse_code = Column(String(100), index=True, nullable=True)
    quantity = Column(Float, default=1.0, nullable=False)
    unit = Column(String(30), default="EA", nullable=False)  # EA, SET, M, KG, etc.
    status = Column(String(50), default="REPLACED", nullable=False)  # REPLACED, REPAIRED, SHOP_FABRICATED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("ReclamationJob", back_populates="materials")

class PressureTest(Base):
    __tablename__ = "pressure_tests"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    test_category = Column(String(50), nullable=False)  # SEAT_TEST_US, SEAT_TEST_DS, BODY_TEST
    test_method = Column(String(30), default="HYDRAULIC", nullable=False)  # HYDRAULIC, PNEUMATIC
    test_pressure = Column(Float, nullable=False)
    pressure_unit = Column(String(20), default="PSI", nullable=False)  # PSI, BAR, KG/CM2
    actual_result = Column(String(30), default="PENDING", nullable=False)  # PASS, FAIL, PENDING, NOT_PERFORMED
    test_date = Column(Date, default=date.today, nullable=False)
    test_duration_minutes = Column(Integer, nullable=True)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    inspector_name = Column(String(100), nullable=True)
    witness_name = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("ReclamationJob", back_populates="tests")
    inspector = relationship("User", foreign_keys=[inspector_id])

class ValvePhoto(Base):
    __tablename__ = "valve_photos"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    stage = Column(String(50), nullable=False, index=True)  # "BEFORE" (Dismantling/Receipt), "AFTER" (Reclamation/Finished)
    title = Column(String(150), nullable=True)  # e.g., "Seat Cavity Condition", "Lapped Finish"
    work_description = Column(Text, nullable=False)  # Description of dismantling findings or reclamation work performed
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    performed_by_name = Column(String(100), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department_name = Column(String(100), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=False)
    image_data_url = Column(Text, nullable=True)  # Base64 data URL for offline instant preview & permanent storage
    taken_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("ReclamationJob", back_populates="photos")
    performed_by = relationship("User", foreign_keys=[performed_by_id])
    department = relationship("Department", foreign_keys=[department_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


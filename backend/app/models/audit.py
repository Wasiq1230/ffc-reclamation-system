from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from backend.app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    username = Column(String(50), nullable=True)
    action = Column(String(50), nullable=False, index=True)  # CREATE, UPDATE, STATUS_CHANGE, APPROVE, ISSUE, REVISE, DELETE, ARCHIVE
    entity_name = Column(String(50), nullable=False, index=True)  # ReclamationJob, Certificate, Inspection, PressureTest, User, Plant, Department
    entity_id = Column(String(50), nullable=False, index=True)
    details = Column(Text, nullable=True)  # JSON or descriptive text of change
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

class SequenceCounter(Base):
    __tablename__ = "sequence_counters"

    id = Column(Integer, primary_key=True, index=True)
    prefix = Column(String(20), nullable=False)  # e.g., "VR", "CERT"
    year = Column(Integer, nullable=False)        # e.g., 2026
    current_value = Column(Integer, default=0, nullable=False)

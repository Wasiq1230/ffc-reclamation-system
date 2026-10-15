from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # "Plant 1", "Plant 2"
    code = Column(String(20), unique=True, nullable=False)   # "PLANT_1", "PLANT_2"
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    departments = relationship("Department", back_populates="plant", cascade="all, delete-orphan")
    jobs = relationship("ReclamationJob", back_populates="plant")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # "Ammonia", "Urea", "Utilities", "Machinery"
    code = Column(String(50), nullable=False)   # e.g., "P1_AMM", "P2_AMM", "P1_UTL"
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("plant_id", "name", name="uq_plant_department_name"),
        UniqueConstraint("plant_id", "code", name="uq_plant_department_code"),
    )

    # Relationships
    plant = relationship("Plant", back_populates="departments")
    jobs = relationship("ReclamationJob", back_populates="department")

class ExternalCustomer(Base):
    __tablename__ = "external_customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(150), nullable=False, index=True)
    plant_facility_name = Column(String(150), nullable=True)
    department_operating_area = Column(String(150), nullable=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    reference_number = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    jobs = relationship("ReclamationJob", back_populates="external_customer")

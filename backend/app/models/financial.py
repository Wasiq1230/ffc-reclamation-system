from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    quoted_charges = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    approved_charges = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    actual_charges = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    currency = Column(String(10), default="PKR", nullable=False)
    
    invoice_number = Column(String(100), nullable=True)
    invoice_date = Column(Date, nullable=True)
    payments_received = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    payment_reference = Column(String(100), nullable=True)
    payment_date = Column(Date, nullable=True)
    outstanding_balance = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    job = relationship("ReclamationJob", back_populates="financial_record")

    def calculate_balance(self):
        # Outstanding balance is approved charges (or actual charges if set) minus payments received
        base = self.actual_charges if self.actual_charges > Decimal("0.00") else self.approved_charges
        self.outstanding_balance = base - self.payments_received
        return self.outstanding_balance

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from backend.app.database import Base

class DocumentAttachment(Base):
    __tablename__ = "document_attachments"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=False)
    document_category = Column(String(50), nullable=False)  # RECLAMATION_FORM, INSPECTION_REPORT, TEST_REPORT, PHOTO, WORK_ORDER, INVOICE, OTHER
    description = Column(String(255), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("ReclamationJob", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by_id])

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_number = Column(String(50), index=True, nullable=False) # e.g. "CERT-2026-000001"
    job_id = Column(Integer, ForeignKey("reclamation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    __table_args__ = (
        UniqueConstraint("certificate_number", "revision_number", name="uq_cert_number_revision"),
    )
    
    # Form Reference from official standard
    form_title = Column(String(100), default="VALVE RECLAMATION TEST CERTIFICATE", nullable=False)
    form_reference = Column(String(50), default="QF-003-05-307", nullable=False)
    annexure = Column(String(50), default="ANNEXURE-III", nullable=False)
    form_ref_date = Column(String(50), default="13-05-2025", nullable=False)
    
    # Header Identification Fields (Auto-populated and editable)
    identification_no = Column(String(100), nullable=False)
    certificate_date = Column(Date, default=date.today, nullable=False)
    area = Column(String(150), nullable=False)  # Area = Plant + Department, or External Area
    notification_no = Column(String(100), nullable=True)
    valve_description = Column(String(255), nullable=False)

    # 01. Body Seat
    body_seat_stellited = Column(Boolean, default=False, nullable=False)
    body_seat_machined = Column(Boolean, default=False, nullable=False)
    body_seat_lapped = Column(Boolean, default=False, nullable=False)

    # 02. Gate / Disc / Plug (Replaced warehouse code with Stellite, Machined, Lapped condition checkboxes)
    gate_disc_plug_warehouse_code = Column(String(100), nullable=True)  # Kept for backward compatibility
    gate_disc_plug_stellited = Column(Boolean, default=False, nullable=False)
    gate_disc_plug_machined = Column(Boolean, default=False, nullable=False)
    gate_disc_plug_lapped = Column(Boolean, default=False, nullable=False)

    # 03. Back Seat (Stem Bushing)
    back_seat_bushing_stellited = Column(Boolean, default=False, nullable=False)
    back_seat_bushing_machined = Column(Boolean, default=False, nullable=False)
    back_seat_bushing_lapped = Column(Boolean, default=False, nullable=False)

    # 04. Back Seat (Stem)
    back_seat_stem_stellited = Column(Boolean, default=False, nullable=False)
    back_seat_stem_machined = Column(Boolean, default=False, nullable=False)
    back_seat_stem_lapped = Column(Boolean, default=False, nullable=False)

    # 05. Stem
    stem_built_up = Column(Boolean, default=False, nullable=False)
    stem_machined = Column(Boolean, default=False, nullable=False)
    stem_polish = Column(Boolean, default=False, nullable=False)

    # 06. Gland Packing
    gland_packing_warehouse_code = Column(String(100), nullable=True)
    gland_packing_specification = Column(String(255), nullable=True)  # Manual entry for custom specification / description
    gland_packing_comp_rpr = Column(Boolean, default=False, nullable=False)
    gland_packing_partl_rpr = Column(Boolean, default=False, nullable=False)

    # 07. Bonnet Gasket
    bonnet_gasket_warehouse_code = Column(String(100), nullable=True)
    bonnet_gasket_specification = Column(String(255), nullable=True)  # Manual entry for custom specification / description
    bonnet_gasket_new = Column(Boolean, default=False, nullable=False)
    bonnet_gasket_old = Column(Boolean, default=False, nullable=False)
    bonnet_gasket_shop_fab = Column(Boolean, default=False, nullable=False)

    # 08. PRESSURE TESTING
    # Test 1: Seat Test U/S
    seat_test_us_hyd = Column(Boolean, default=False, nullable=False)
    seat_test_us_pneumatic = Column(Boolean, default=False, nullable=False)
    seat_test_us_pressure = Column(String(50), nullable=True)
    seat_test_us_result = Column(String(50), nullable=True)

    # Test 2: Seat Test D/S
    seat_test_ds_hyd = Column(Boolean, default=False, nullable=False)
    seat_test_ds_pneumatic = Column(Boolean, default=False, nullable=False)
    seat_test_ds_pressure = Column(String(50), nullable=True)
    seat_test_ds_result = Column(String(50), nullable=True)

    # Test 3: Body Test
    body_test_hyd = Column(Boolean, default=False, nullable=False)
    body_test_pneumatic = Column(Boolean, default=False, nullable=False)
    body_test_pressure = Column(String(50), nullable=True)
    body_test_result = Column(String(50), nullable=True)

    # 09. Ends
    ends_distance = Column(Boolean, default=False, nullable=False)
    ends_built_up = Column(Boolean, default=False, nullable=False)
    ends_machined = Column(Boolean, default=False, nullable=False)

    # RECLAIMED BY
    reclaimed_by_name = Column(String(100), nullable=True)
    reclaimed_by_pno = Column(String(50), nullable=True)

    # CHECKED BY
    checked_by_name = Column(String(100), nullable=True)
    checked_by_pno = Column(String(50), nullable=True)

    # WITNESS from Inspection Section
    witness_comments = Column(Text, nullable=True)
    witness_sign = Column(String(100), nullable=True)  # Text / Signature identity reference

    # Special Note & Digital Signature
    special_note = Column(Text, nullable=True)  # Optional manual notes/instructions displayed at end of certificate
    digital_signature = Column(Text, nullable=True)  # Base64 data URL PNG drawn signature
    digital_signature_date = Column(DateTime, nullable=True)
    signed_by_name = Column(String(100), nullable=True)

    # Workflow & Revision Control
    # Statuses: DRAFT, AWAITING_REVIEW, APPROVED, ISSUED, SUPERSEDED, CANCELLED
    status = Column(String(30), default="DRAFT", nullable=False, index=True)
    revision_number = Column(Integer, default=0, nullable=False)
    parent_certificate_id = Column(Integer, ForeignKey("certificates.id"), nullable=True)
    
    # Audit & Tracking
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    issued_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    issued_at = Column(DateTime, nullable=True)
    
    pdf_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("ReclamationJob", back_populates="certificates")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    issued_by = relationship("User", foreign_keys=[issued_by_id])
    parent_certificate = relationship("Certificate", remote_side=[id], backref="revisions")

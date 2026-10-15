from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel

class CertificateBase(BaseModel):
    identification_no: str
    certificate_date: date = date.today()
    area: str
    notification_no: Optional[str] = None
    valve_description: str

    # 01. Body Seat
    body_seat_stellited: bool = False
    body_seat_machined: bool = False
    body_seat_lapped: bool = False

    # 02. Gate / Disc / Plug (Replaced warehouse code with Stellite, Machined, Lapped condition checkboxes)
    gate_disc_plug_warehouse_code: Optional[str] = None
    gate_disc_plug_stellited: bool = False
    gate_disc_plug_machined: bool = False
    gate_disc_plug_lapped: bool = False

    # 03. Back Seat (Stem Bushing)
    back_seat_bushing_stellited: bool = False
    back_seat_bushing_machined: bool = False
    back_seat_bushing_lapped: bool = False

    # 04. Back Seat (Stem)
    back_seat_stem_stellited: bool = False
    back_seat_stem_machined: bool = False
    back_seat_stem_lapped: bool = False

    # 05. Stem
    stem_built_up: bool = False
    stem_machined: bool = False
    stem_polish: bool = False

    # 06. Gland Packing
    gland_packing_warehouse_code: Optional[str] = None
    gland_packing_specification: Optional[str] = None
    gland_packing_comp_rpr: bool = False
    gland_packing_partl_rpr: bool = False

    # 07. Bonnet Gasket
    bonnet_gasket_warehouse_code: Optional[str] = None
    bonnet_gasket_specification: Optional[str] = None
    bonnet_gasket_new: bool = False
    bonnet_gasket_old: bool = False
    bonnet_gasket_shop_fab: bool = False

    # 08. PRESSURE TESTING
    seat_test_us_hyd: bool = False
    seat_test_us_pneumatic: bool = False
    seat_test_us_pressure: Optional[str] = None
    seat_test_us_result: Optional[str] = None

    seat_test_ds_hyd: bool = False
    seat_test_ds_pneumatic: bool = False
    seat_test_ds_pressure: Optional[str] = None
    seat_test_ds_result: Optional[str] = None

    body_test_hyd: bool = False
    body_test_pneumatic: bool = False
    body_test_pressure: Optional[str] = None
    body_test_result: Optional[str] = None

    # 09. Ends
    ends_distance: bool = False
    ends_built_up: bool = False
    ends_machined: bool = False

    # Personnel
    reclaimed_by_name: Optional[str] = None
    reclaimed_by_pno: Optional[str] = None
    checked_by_name: Optional[str] = None
    checked_by_pno: Optional[str] = None

    # Witness
    witness_comments: Optional[str] = None
    witness_sign: Optional[str] = None

    # Special Note & Digital Signature
    special_note: Optional[str] = None
    digital_signature: Optional[str] = None
    digital_signature_date: Optional[datetime] = None
    signed_by_name: Optional[str] = None

class CertificateCreate(CertificateBase):
    job_id: int

class CertificateUpdate(BaseModel):
    identification_no: Optional[str] = None
    certificate_date: Optional[date] = None
    area: Optional[str] = None
    notification_no: Optional[str] = None
    valve_description: Optional[str] = None

    body_seat_stellited: Optional[bool] = None
    body_seat_machined: Optional[bool] = None
    body_seat_lapped: Optional[bool] = None
    gate_disc_plug_warehouse_code: Optional[str] = None
    gate_disc_plug_stellited: Optional[bool] = None
    gate_disc_plug_machined: Optional[bool] = None
    gate_disc_plug_lapped: Optional[bool] = None
    back_seat_bushing_stellited: Optional[bool] = None
    back_seat_bushing_machined: Optional[bool] = None
    back_seat_bushing_lapped: Optional[bool] = None
    back_seat_stem_stellited: Optional[bool] = None
    back_seat_stem_machined: Optional[bool] = None
    back_seat_stem_lapped: Optional[bool] = None
    stem_built_up: Optional[bool] = None
    stem_machined: Optional[bool] = None
    stem_polish: Optional[bool] = None
    gland_packing_warehouse_code: Optional[str] = None
    gland_packing_specification: Optional[str] = None
    gland_packing_comp_rpr: Optional[bool] = None
    gland_packing_partl_rpr: Optional[bool] = None
    bonnet_gasket_warehouse_code: Optional[str] = None
    bonnet_gasket_specification: Optional[str] = None
    bonnet_gasket_new: Optional[bool] = None
    bonnet_gasket_old: Optional[bool] = None
    bonnet_gasket_shop_fab: Optional[bool] = None

    seat_test_us_hyd: Optional[bool] = None
    seat_test_us_pneumatic: Optional[bool] = None
    seat_test_us_pressure: Optional[str] = None
    seat_test_us_result: Optional[str] = None

    seat_test_ds_hyd: Optional[bool] = None
    seat_test_ds_pneumatic: Optional[bool] = None
    seat_test_ds_pressure: Optional[str] = None
    seat_test_ds_result: Optional[str] = None

    body_test_hyd: Optional[bool] = None
    body_test_pneumatic: Optional[bool] = None
    body_test_pressure: Optional[str] = None
    body_test_result: Optional[str] = None

    ends_distance: Optional[bool] = None
    ends_built_up: Optional[bool] = None
    ends_machined: Optional[bool] = None

    reclaimed_by_name: Optional[str] = None
    reclaimed_by_pno: Optional[str] = None
    checked_by_name: Optional[str] = None
    checked_by_pno: Optional[str] = None
    witness_comments: Optional[str] = None
    witness_sign: Optional[str] = None
    special_note: Optional[str] = None
    digital_signature: Optional[str] = None
    digital_signature_date: Optional[datetime] = None
    signed_by_name: Optional[str] = None

class CertificateOut(CertificateBase):
    id: int
    job_id: int
    certificate_number: str
    form_title: str
    form_reference: str
    annexure: str
    form_ref_date: str
    status: str
    revision_number: int
    parent_certificate_id: Optional[int] = None
    created_by_id: int
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    issued_by_id: Optional[int] = None
    issued_at: Optional[datetime] = None
    pdf_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CertificateReviseRequest(BaseModel):
    reason: str
    changes: Optional[CertificateUpdate] = None

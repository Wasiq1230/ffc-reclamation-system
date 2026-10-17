import re
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.audit import SequenceCounter
from backend.app.config import settings

def _get_max_job_sequence(db: Session, year: int) -> int:
    """Extract highest sequence number from existing reclamation jobs (both legacy VR- and new FAB-)."""
    try:
        from backend.app.models.job import ReclamationJob
        jobs = db.query(ReclamationJob.tracking_id).filter(
            (ReclamationJob.tracking_id.like(f"VR-{year}-%")) |
            (ReclamationJob.tracking_id.like(f"FAB-{year}-%"))
        ).all()
        max_seq = 0
        for (tid,) in jobs:
            if tid:
                m = re.search(r"-(\d+)$", tid)
                if m:
                    max_seq = max(max_seq, int(m.group(1)))
        return max_seq
    except Exception:
        return 0

def generate_next_sequence_id(db: Session, prefix: str = None) -> str:
    """
    Generates an atomic, collision-free sequential ID like FAB-2026-000001 or CERT-2026-000001.
    Uses database row-level locking / atomic increment in a transaction.
    Seamlessly continues numbering from legacy VR sequence when generating FAB IDs.
    """
    if prefix is None:
        prefix = settings.DEFAULT_VR_PREFIX

    current_year = datetime.utcnow().year

    # Query with FOR UPDATE lock if supported (e.g. Postgres), fallback safely for SQLite
    query = db.query(SequenceCounter).filter(
        SequenceCounter.prefix == prefix,
        SequenceCounter.year == current_year
    )
    
    try:
        counter = query.with_for_update().first()
    except Exception:
        # SQLite doesn't support with_for_update, query standard
        counter = query.first()

    if not counter:
        # Carry over existing sequence from legacy prefix (VR) or existing jobs
        start_val = 0
        if prefix == "FAB":
            vr_counter = db.query(SequenceCounter).filter(
                SequenceCounter.prefix == "VR",
                SequenceCounter.year == current_year
            ).first()
            if vr_counter and vr_counter.current_value > start_val:
                start_val = vr_counter.current_value
            max_job_seq = _get_max_job_sequence(db, current_year)
            if max_job_seq > start_val:
                start_val = max_job_seq

        seq_num = start_val + 1
        counter = SequenceCounter(prefix=prefix, year=current_year, current_value=seq_num)
        db.add(counter)
        db.flush()
    else:
        # Ensure counter is never lower than existing legacy jobs (prevents duplicates)
        if prefix == "FAB":
            max_job_seq = _get_max_job_sequence(db, current_year)
            if max_job_seq > counter.current_value:
                counter.current_value = max_job_seq
        counter.current_value += 1
        db.flush()
        seq_num = counter.current_value

    formatted_id = f"{prefix}-{current_year}-{seq_num:06d}"
    return formatted_id

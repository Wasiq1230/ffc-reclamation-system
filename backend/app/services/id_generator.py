from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.audit import SequenceCounter
from backend.app.config import settings

def generate_next_sequence_id(db: Session, prefix: str = None) -> str:
    """
    Generates an atomic, collision-free sequential ID like VR-2026-000001 or CERT-2026-000001.
    Uses database row-level locking / atomic increment in a transaction.
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
        counter = SequenceCounter(prefix=prefix, year=current_year, current_value=1)
        db.add(counter)
        db.flush()
        seq_num = 1
    else:
        counter.current_value += 1
        db.flush()
        seq_num = counter.current_value

    formatted_id = f"{prefix}-{current_year}-{seq_num:06d}"
    return formatted_id

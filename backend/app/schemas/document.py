from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class DocumentOut(BaseModel):
    id: int
    job_id: int
    file_name: str
    file_size: int
    content_type: str
    document_category: str
    description: Optional[str] = None
    uploaded_by_id: int
    created_at: datetime

    class Config:
        from_attributes = True

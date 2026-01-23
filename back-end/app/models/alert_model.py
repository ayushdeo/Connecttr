from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class Alert(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    org_id: str
    type: str # daily_limit_reached, rate_limit_exceeded
    severity: str = "warning" # info, warning, error
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLog(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    org_id: str
    user_id: str
    action: str
    resource: str
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

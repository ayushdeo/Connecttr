from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Organization(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    owner_id: str
    plan: str = "free"  # free, pro
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

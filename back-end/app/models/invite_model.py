from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class OrgInvite(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    org_id: str
    email: EmailStr
    role: str = "member"  # admin, member
    token: str
    expires_at: datetime
    status: str = "pending" # pending, accepted, expired, revoked
    invited_by_user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

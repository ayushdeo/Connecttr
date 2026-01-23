from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    provider: str = "google"  # oauth provider
    role: str = "user"        # user, admin
    org_id: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    provider_user_id: str

class UserInDB(UserBase):
    id: Optional[str] = Field(None, alias="_id")
    provider_user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

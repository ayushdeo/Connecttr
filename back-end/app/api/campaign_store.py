# ---- simple campaign store (MongoDB-based) ----
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time, uuid, os
from app.db import get_campaigns_collection, get_audit_collection
from fastapi import Depends
from app.core.deps import get_current_user_with_org
from app.models.user_model import UserInDB
from datetime import datetime


store_router = APIRouter(prefix="/campaigns", tags=["campaigns"])

class CampaignCreateIn(BaseModel):
    name: str
    website: str | None = None
    brief: dict

class CampaignUpdateIn(BaseModel):
    name: str | None = None
    website: str | None = None
    brief: dict | None = None

class CampaignOut(BaseModel):
    id: str
    name: str
    website: str | None = None
    brief: dict
    created_at: float

@store_router.post("", response_model=CampaignOut)
def create_campaign(payload: CampaignCreateIn, current_user: UserInDB = Depends(get_current_user_with_org)):
    collection = get_campaigns_collection()
    cid = uuid.uuid4().hex[:12]
    item = {
        "id": cid,
        "org_id": current_user.org_id,
        "owner_id": current_user.id,
        "name": payload.name,
        "website": payload.website,
        "brief": payload.brief,
        "created_at": time.time(),
    }
    # Insert into MongoDB
    collection.insert_one(item.copy())
    
    # Audit
    get_audit_collection().insert_one({
        "org_id": current_user.org_id,
        "user_id": current_user.id,
        "action": "create_campaign",
        "resource": f"campaign/{cid}",
        "timestamp": datetime.utcnow()
    })

    return item

@store_router.get("", response_model=list[CampaignOut])
def list_campaigns(current_user: UserInDB = Depends(get_current_user_with_org)):
    collection = get_campaigns_collection()
    campaigns = []
    # SAAS ISOLATION: Filter by org_id
    for doc in collection.find({"org_id": current_user.org_id}):
        doc["id"] = str(doc.get("id") or doc.get("_id"))
        if "_id" in doc: del doc["_id"]
        campaigns.append(doc)
    return campaigns

@store_router.get("/{cid}", response_model=CampaignOut)
def get_campaign(cid: str, current_user: UserInDB = Depends(get_current_user_with_org)):
    collection = get_campaigns_collection()
    # SAAS ISOLATION: match by id AND org_id
    camp = collection.find_one({"id": cid, "org_id": current_user.org_id})
    if not camp:
        raise HTTPException(status_code=404, detail="Not found")
    
    if "_id" in camp: del camp["_id"]
    return camp

@store_router.patch("/{cid}", response_model=CampaignOut)
def update_campaign(payload: CampaignUpdateIn, cid: str, current_user: UserInDB = Depends(get_current_user_with_org)):
    collection = get_campaigns_collection()
    camp = collection.find_one({"id": cid, "org_id": current_user.org_id})
    if not camp:
        raise HTTPException(status_code=404, detail="Not found")

    updates = payload.dict(exclude_unset=True)
    if "website" in updates and not updates["website"]:
        updates["website"] = None

    if updates:
        collection.update_one({"id": cid, "org_id": current_user.org_id}, {"$set": updates})
        get_audit_collection().insert_one({
            "org_id": current_user.org_id,
            "user_id": current_user.id,
            "action": "update_campaign",
            "resource": f"campaign/{cid}",
            "timestamp": datetime.utcnow()
        })
        camp.update(updates)

    if "_id" in camp:
        del camp["_id"]
    return camp

# --- alias for external imports ---
# WARNING: Internal server calls usually don't have user context easily. 
# But discover_campaign calls this. It SHOULD pass user context or org_id.
# We will update the signature to require context or we must trust caller to have verified permissions?
# StartNewCampaign calls analyze endpoint -> pure logic.
# CampaignManager calls create_campaign -> covered above.
# CampaignManager calls discover -> this calls campaign_discover in campaigns.py -> which calls get_campaign_by_id.

def get_campaign_by_id(cid: str, org_id: str = None):
    # If org_id provided, enforce it. If not, it's unsafe unless system-only.
    # For SaaS, we should always require org_id.
    collection = get_campaigns_collection()
    query = {"id": cid}
    if org_id:
        query["org_id"] = org_id
        
    camp = collection.find_one(query)
    if camp and "_id" in camp: del camp["_id"]
    return camp

campaign_store_router = store_router

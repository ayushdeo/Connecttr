# ---- simple campaign store (MongoDB-based) ----
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time, uuid, os
from app.db import get_campaigns_collection

store_router = APIRouter(prefix="/campaigns", tags=["campaigns"])

class CampaignCreateIn(BaseModel):
    name: str
    website: str | None = None
    brief: dict

class CampaignOut(BaseModel):
    id: str
    name: str
    website: str | None = None
    brief: dict
    created_at: float

@store_router.post("", response_model=CampaignOut)
def create_campaign(payload: CampaignCreateIn):
    collection = get_campaigns_collection()
    cid = uuid.uuid4().hex[:12]
    item = {
        "id": cid,
        "name": payload.name,
        "website": payload.website,
        "brief": payload.brief,
        "created_at": time.time(),
    }
    # Insert into MongoDB
    collection.insert_one(item.copy())
    
    # Return as model (remove mongo _id if present in dict used for logic, though here we copied)
    return item

@store_router.get("", response_model=list[CampaignOut])
def list_campaigns():
    collection = get_campaigns_collection()
    campaigns = []
    for doc in collection.find():
        doc["id"] = str(doc.get("id") or doc.get("_id"))
        if "_id" in doc: del doc["_id"]
        campaigns.append(doc)
    return campaigns

@store_router.get("/{cid}", response_model=CampaignOut)
def get_campaign(cid: str):
    collection = get_campaigns_collection()
    # match by id string
    camp = collection.find_one({"id": cid})
    if not camp:
        raise HTTPException(status_code=404, detail="Not found")
    
    if "_id" in camp: del camp["_id"]
    return camp

# --- alias for external imports ---
def get_campaign_by_id(cid: str):
    collection = get_campaigns_collection()
    camp = collection.find_one({"id": cid})
    if camp and "_id" in camp: del camp["_id"]
    return camp

campaign_store_router = store_router 
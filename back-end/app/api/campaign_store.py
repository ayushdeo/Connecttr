# ---- simple campaign store (file-based) ----
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import json, time, uuid, os

store_router = APIRouter(prefix="/campaigns", tags=["campaigns"])
BASE_DIR = Path(__file__).resolve().parents[2]  # project/back-end
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "campaigns_db.json"

def _load_db():
    if DB_PATH.exists():
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"campaigns": []}

def _save_db(db):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

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
    db = _load_db()
    cid = uuid.uuid4().hex[:12]
    item = {
        "id": cid,
        "name": payload.name,
        "website": payload.website,
        "brief": payload.brief,
        "created_at": time.time(),
    }
    db["campaigns"].append(item)
    _save_db(db)
    return item

@store_router.get("", response_model=list[CampaignOut])
def list_campaigns():
    return _load_db()["campaigns"]

@store_router.get("/{cid}", response_model=CampaignOut)
def get_campaign(cid: str):
    db = _load_db()
    for c in db["campaigns"]:
        if c["id"] == cid:
            return c
    raise HTTPException(status_code=404, detail="Not found")

# --- add these two lines ---
def get_campaign_by_id(cid: str):  # alias for external imports
    return get_campaign(cid)

campaign_store_router = store_router 
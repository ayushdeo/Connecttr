from fastapi import APIRouter, HTTPException, Request 
from pydantic import BaseModel, HttpUrl
from typing import Optional
from app.services.web_extractor import extract_main_text
from app.services.company_analyzer import analyze_company_brief
from app.api.campaign_store import get_campaign_by_id  # adjust import to your store file
from app.services.lead_discovery import discover_from_brief
from app.services.contact_enricher import enrich_leads_with_email
from app.services.email_service import upsert_leads_to_hub
from fastapi import Depends
from app.core.deps import get_current_user_with_org
from app.db import get_audit_collection
from app.models.user_model import UserInDB
from datetime import datetime
import os, time, requests, traceback


router = APIRouter(prefix="/campaigns", tags=["campaigns"])
_PORT = os.getenv("PORT")                      # Render injects this
_emailhub_env = os.getenv("EMAILHUB_URL")      # optional override

if _emailhub_env:
    EMAILHUB_URL = _emailhub_env.rstrip("/")
elif _PORT:
    # If running on Render (or similar), localhost port logic might apply for self-calls
    EMAILHUB_URL = f"http://127.0.0.1:{_PORT}"
else:
    EMAILHUB_URL = "http://127.0.0.1:8000"

@router.post("/{campaign_id}/discover")
def campaign_discover(campaign_id: str, dry_run: bool = False, current_user: UserInDB = Depends(get_current_user_with_org)):
    # SAAS ISOLATION: Enforce org_id
    camp = get_campaign_by_id(campaign_id, org_id=current_user.org_id)
    if not camp:
        raise HTTPException(404, "Campaign not found")

    brief = camp.get("brief") or {}
    if camp.get("website"):
        brief["client_website"] = camp["website"]

    t0 = time.time()
    try:
        leads = discover_from_brief(campaign_id, brief, per_query=6)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"lead discovery crashed: {e}")

    # optional email enrichment
    try:
        leads = enrich_leads_with_email(leads, max_to_enrich=20)
    except Exception as e:
        traceback.print_exc()

    took = round(time.time() - t0, 2)

    if dry_run:
        return {"mode":"preview","count":len(leads),"took_seconds":took,"preview":leads[:5]}

    try:
        # Pass org_id for insertion
        upsert_leads_to_hub(leads, org_id=current_user.org_id)
        
        # Audit
        get_audit_collection().insert_one({
            "org_id": current_user.org_id,
            "user_id": current_user.id,
            "action": "discover_leads",
            "resource": f"campaign/{campaign_id}",
            "metadata": {"count": len(leads)},
            "timestamp": datetime.utcnow()
        })
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"import failed: {e}")

    return {"mode":"import","imported":len(leads),"took_seconds":took,"preview":leads[:5]}


    # r = requests.post(f"{EMAILHUB_URL}/emailhub/leads/import", json=leads, timeout=60)
    # r.raise_for_status()
    # return {"mode":"import","imported":len(leads),"took_seconds":took,"preview":leads[:5]}


class AnalyzeIn(BaseModel):
    website: Optional[HttpUrl] = None
    prompt: Optional[str] = None  # fallback free-text

class AnalyzeOut(BaseModel):
    mode: str  # "website" or "prompt"
    brief: dict
    fallback_needed: bool

@router.post("/analyze", response_model=AnalyzeOut)
def analyze(input: AnalyzeIn, current_user: UserInDB = Depends(get_current_user_with_org)):
    text_source = ""
    mode = "prompt"
    if input.website:
        try:
            text_source, meta = extract_main_text(str(input.website))
            mode = "website"
        except Exception as e:
            # fall through to prompt if provided
            if not input.prompt:
                raise HTTPException(status_code=400, detail=f"Website fetch failed: {e}")

    if not text_source and not input.prompt:
        raise HTTPException(status_code=400, detail="Provide website or prompt")

    basis = text_source or input.prompt or ""
    brief = analyze_company_brief(basis, website=str(input.website) if input.website else None)
    # if low quality AND no user prompt, suggest fallback
    fallback = brief.get("quality", 0.0) < 0.55 and not input.prompt
    return {"mode": mode, "brief": brief, "fallback_needed": fallback}
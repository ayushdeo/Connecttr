# app/api/campaigns.py
import os, json, traceback, asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl

from app.services.web_extractor import extract_main_text
from app.services.company_analyzer import analyze_company_brief
from app.services.lead_discovery import discover_from_brief
from app.services.contact_enricher import enrich_leads_with_email
from app.services.email_service import upsert_leads_to_hub
from app.api.campaign_store import get_campaign_by_id
from app.core.deps import get_current_user_with_org
from app.models.user_model import UserInDB
from app.db import get_audit_collection

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ---------------------------------------------------------------------------
# Lead discovery — streaming, always preview-mode (no DB write)
# Frontend calls /confirm after user reviews the lead list.
# ---------------------------------------------------------------------------

@router.post("/{campaign_id}/discover")
def campaign_discover(
    campaign_id: str,
    current_user: UserInDB = Depends(get_current_user_with_org),
):
    camp = get_campaign_by_id(campaign_id, org_id=current_user.org_id)
    if not camp:
        raise HTTPException(404, "Campaign not found")

    brief = camp.get("brief") or {}
    if camp.get("website"):
        brief["client_website"] = camp["website"]

    async def orchestrator():
        loop = asyncio.get_event_loop()
        try:
            yield json.dumps({"type": "progress", "progress": 5, "step": "Starting lead search..."}) + "\n"

            # --- Phase 1: Discovery (sync generator, run in thread pool) ---
            leads = []

            def _run_discovery():
                result = []
                for chunk in discover_from_brief(campaign_id, brief, per_query=12):
                    if chunk.get("type") == "result":
                        result = chunk.get("leads", [])
                return result

            # Yield progress while discovery runs in executor
            yield json.dumps({"type": "progress", "progress": 15, "step": "Searching for leads across platforms..."}) + "\n"

            # Run blocking scraping off the event loop
            leads = await loop.run_in_executor(None, _run_discovery)

            yield json.dumps({
                "type": "progress",
                "progress": 70,
                "step": f"Found {len(leads)} candidates — finding contact info...",
            }) + "\n"

            # --- Phase 2: Enrichment (sync generator, run in thread pool) ---
            def _run_enrichment():
                result = leads
                for chunk in enrich_leads_with_email(leads, max_to_enrich=50):
                    if chunk.get("type") == "result":
                        result = chunk.get("leads", [])
                return result

            leads = await loop.run_in_executor(None, _run_enrichment)

            # --- Build summary ---
            verified = sum(
                1 for l in leads
                if l.get("email") and l.get("status") not in ("Guessed", "Needs Email")
            )
            guessed = sum(1 for l in leads if l.get("status") == "Guessed")
            needs_email = sum(1 for l in leads if l.get("status") == "Needs Email")

            yield json.dumps({"type": "progress", "progress": 98, "step": "Preparing review..."}) + "\n"
            yield json.dumps({
                "type": "final",
                "leads": leads,          # all leads — frontend renders review modal
                "summary": {
                    "total": len(leads),
                    "verified": verified,
                    "guessed": guessed,
                    "needs_email": needs_email,
                },
            }) + "\n"

        except Exception as e:
            traceback.print_exc()
            yield json.dumps({"type": "error", "message": f"Server Error: {e}"}) + "\n"

    return StreamingResponse(orchestrator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Confirm — save user-reviewed leads to the database
# ---------------------------------------------------------------------------

class ConfirmIn(BaseModel):
    leads: list[dict]


@router.post("/{campaign_id}/confirm")
def campaign_confirm(
    campaign_id: str,
    body: ConfirmIn,
    current_user: UserInDB = Depends(get_current_user_with_org),
):
    camp = get_campaign_by_id(campaign_id, org_id=current_user.org_id)
    if not camp:
        raise HTTPException(404, "Campaign not found")

    if not body.leads:
        raise HTTPException(400, "No leads to import")

    upsert_leads_to_hub(body.leads, org_id=current_user.org_id)

    get_audit_collection().insert_one({
        "org_id": current_user.org_id,
        "user_id": current_user.id,
        "action": "discover_leads",
        "resource": f"campaign/{campaign_id}",
        "metadata": {"count": len(body.leads)},
        "timestamp": datetime.utcnow(),
    })

    return {"imported": len(body.leads)}


# ---------------------------------------------------------------------------
# Analyze — extract campaign brief from website or free-text prompt
# ---------------------------------------------------------------------------

class AnalyzeIn(BaseModel):
    website: Optional[HttpUrl] = None
    prompt: Optional[str] = None


class AnalyzeOut(BaseModel):
    mode: str
    brief: dict
    fallback_needed: bool
    fallback_reason: str


@router.post("/analyze", response_model=AnalyzeOut)
def analyze(
    input: AnalyzeIn,
    current_user: UserInDB = Depends(get_current_user_with_org),
):
    text_source = ""
    mode = "prompt"

    if input.website:
        try:
            text_source, _ = extract_main_text(str(input.website))
            mode = "website"
        except Exception as e:
            if not input.prompt:
                raise HTTPException(status_code=400, detail=f"Website fetch failed: {e}")

    if not text_source and not input.prompt:
        raise HTTPException(status_code=400, detail="Provide a website URL or a text description")

    basis = text_source or input.prompt or ""
    brief = analyze_company_brief(basis, website=str(input.website) if input.website else None)

    validation_passed = brief.pop("_validation_passed", True)
    validation_reason = brief.pop("_validation_reason", "")

    fallback = not validation_passed and not input.prompt
    return {
        "mode": mode,
        "brief": brief,
        "fallback_needed": fallback,
        "fallback_reason": validation_reason if fallback else "",
    }

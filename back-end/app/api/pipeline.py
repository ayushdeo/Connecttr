from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
import os

from app.services.scraper_service import run_scraper
from app.services.intent_service import run_intent_pipeline

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

# Security: requires X-API-KEY header
API_SECRET = os.getenv("API_SECRET", "change_me_in_prod")

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

class ScrapeReq(BaseModel):
    query: str | None = None

class IntentReq(BaseModel):
    campaign_id: str = "demo"

@router.post("/scrape", dependencies=[Depends(verify_api_key)])
def trigger_scrape(body: ScrapeReq):
    """
    Trigger the scraper. 
    Query defaults to the hardcoded config if not provided.
    """
    try:
        if body.query:
            result = run_scraper(body.query)
        else:
            result = run_scraper() # defaults
        return {"ok": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/classify", dependencies=[Depends(verify_api_key)])
def trigger_intent(body: IntentReq):
    """
    Trigger the intent classification & email push pipeline.
    """
    try:
        # Dynamically pass campaign_id
        result = run_intent_pipeline(campaign_id=body.campaign_id)
        return {"ok": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import Dict, Any, List
from datetime import datetime

from app.db import get_leads_collection, get_database
from app.core.deps import get_current_user_with_org
from app.services.intent_service import calculate_composite_score

router = APIRouter(prefix="/intent", tags=["intent-analytics"])

@router.get("/score/{lead_id}")
async def get_intent_score(lead_id: str, current_user=Depends(get_current_user_with_org)):
    """
    Returns the full score breakdown (Rule vs AI vs Engagement).
    """
    leads_col = get_leads_collection()
    lead = leads_col.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        # Fallback to string ID if not ObjectId
        lead = leads_col.find_one({"id": lead_id})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # SAAS SAFETY
    if lead.get("org_id") != current_user.org_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "rule_score": lead.get("rule_score", 0),
        "llm_score": lead.get("llm_score", 0),
        "engagement_modifier": lead.get("engagement_modifier", 1.0), # Assuming this is stored or calculated
        "final_score": lead.get("final_score", 0),
        "intent_label": lead.get("intent_label", "Unknown")
    }

@router.get("/explain/{lead_id}")
async def explain_intent(lead_id: str, current_user=Depends(get_current_user_with_org)):
    """
    Returns the ai_reasoning and matched lead_signals.
    """
    leads_col = get_leads_collection()
    lead = leads_col.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        lead = leads_col.find_one({"id": lead_id})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("org_id") != current_user.org_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "ai_reasoning": lead.get("ai_reasoning", "No LLM reasoning available."),
        "matched_signals": lead.get("matched_signals", []), # Logic for storing these needs to be in pipeline
        "recency_factor": lead.get("recency_factor", 1.0),
        "kind": lead.get("kind", "unknown")
    }

@router.post("/webhooks/engagement")
async def engagement_webhook(data: Dict[str, Any]):
    """
    Unified engagement updates (Postmark, LinkedIn, CRM).
    Triggers multiplier, score recalculation, and intent history write.
    """
    # 1. Identify Lead (by email or ID)
    leads_col = get_leads_collection()
    email = data.get("email")
    lead_id = data.get("lead_id")
    
    filter_q = {}
    if lead_id: filter_q["_id"] = ObjectId(lead_id)
    elif email: filter_q["email"] = email
    else: raise HTTPException(400, "Missing lead identifier")
    
    lead = leads_col.find_one(filter_q)
    if not lead:
        raise HTTPException(404, "Lead not found")
    
    # 2. Update Engagement History
    # This is a sample logic - ideally track in a nested object or separate collection
    event_type = data.get("event") # e.g. "click", "open", "reply"
    
    inc_fields = {}
    if event_type == "click": inc_fields["engagement_clicks"] = 1
    elif event_type == "open": inc_fields["engagement_opens"] = 1
    elif event_type == "reply": inc_fields["engagement_replies"] = 1
    
    # 3. Recalculate Score
    # We fetch updated counts (pretend we just updated them)
    updated_eng = {
        "clicks": lead.get("engagement_clicks", 0) + (1 if event_type == "click" else 0),
        "opens": lead.get("engagement_opens", 0) + (1 if event_type == "open" else 0),
        "replies": lead.get("engagement_replies", 0) + (1 if event_type == "reply" else 0),
    }
    
    # Get existing scores
    r_score = lead.get("rule_score", 0)
    l_score = lead.get("llm_score", 0)
    
    new_final_score = calculate_composite_score(r_score, l_score, updated_eng)
    
    # 4. Phase 2: Behavioral Updates
    db = get_database()
    org_id = lead.get("org_id", "default")
    campaign_id = lead.get("campaign_id", "default")
    variant = lead.get("sent_variant") # A | B | C - should be stored during send
    
    # 4A. Template Performance
    if variant:
        tp_col = db["template_performance"]
        tp_update = {"$inc": {}}
        if event_type == "open": tp_update["$inc"]["opens"] = 1
        elif event_type == "click": tp_update["$inc"]["clicks"] = 1
        elif event_type == "reply": tp_update["$inc"]["positive_replies"] = 1
        
        if tp_update["$inc"]:
            # CTR/Conversion recalculation happen on-read or periodically
            tp_col.update_one(
                {"org_id": org_id, "campaign_id": campaign_id, "template_variant": variant},
                {**tp_update, "$set": {"last_updated": datetime.utcnow()}},
                upsert=True
            )

    # 4B. Send-Time Optimization (Lightweight aggregation)
    now = datetime.utcnow()
    # We update the profile for the org
    db["org_send_profiles"].update_one(
        {"org_id": org_id},
        {"$push": {"engagement_timestamps": {"hour": now.hour, "weekday": now.weekday(), "event": event_type}}},
        upsert=True
    )

    # 4C. Signal Reinforcement
    # If positive engagement, boost weights for the signals that triggered this lead
    if event_type in ("click", "reply"):
        matched_signals = lead.get("matched_signals", [])
        if matched_signals:
            sw_col = db["signal_weights"]
            for sig in matched_signals:
                sw_col.update_one(
                    {"org_id": org_id, "signal_type": sig},
                    {"$inc": {"weight_boost": 0.05}, "$set": {"last_boost_at": datetime.utcnow()}},
                    upsert=True
                )

    leads_col.update_one(filter_q, update_q)
    
    return {"ok": True, "new_score": new_final_score}

@router.get("/orgs/behavioral-metrics")
async def get_behavioral_metrics(current_user=Depends(get_current_user_with_org)):
    """
    Dashboard for Phase 2 & 3 metrics.
    """
    db = get_database()
    org_id = current_user.org_id
    
    # Best Templates
    templates = list(db["template_performance"].find({"org_id": org_id}).sort("conversion_rate", -1).limit(5))
    
    # Best Send Hour
    profile = db["org_send_profiles"].find_one({"org_id": org_id})
    best_hour = None
    if profile and profile.get("engagement_timestamps"):
        hours = [t["hour"] for t in profile["engagement_timestamps"] if t["event"] in ("click", "reply")]
        if hours:
            best_hour = max(set(hours), key=hours.count)

    # Top Signals
    signals = list(db["signal_weights"].find({"org_id": org_id}).sort("weight_boost", -1).limit(5))

    return {
        "top_variants": templates,
        "best_hour": best_hour,
        "signal_boosts": signals
    }

# --- PHASE 3 ENDPOINTS ---

from app.services.campaign_health import check_campaign_health
from app.services.scheduler_service import get_schedule_suggestion

@router.get("/orgs/optimization-metrics")
async def get_optimization_metrics(current_user=Depends(get_current_user_with_org)):
    """
    Phase 3: Learning updates and conversion lift.
    """
    db = get_database()
    updates = list(db["learning_updates"].find({"org_id": current_user.org_id}).sort("timestamp", -1).limit(10))
    
    config = db["engine_config"].find_one({"org_id": current_user.org_id}) or {}
    
    return {
        "recent_learning_events": updates,
        "current_weights": {
            "W_LLM": config.get("W_LLM", 0.5),
            "W_RULE": config.get("W_RULE", 0.3)
        }
    }

@router.get("/campaigns/{campaign_id}/health")
async def get_campaign_health_status(campaign_id: str, current_user=Depends(get_current_user_with_org)):
    return check_campaign_health(campaign_id)

@router.get("/ml/status")
async def get_ml_status():
    return {
        "engine_version": "3.0.0-alpha",
        "learning_mode": os.getenv("LEARNING_MODE", "off"),
        "active_models": ["LogitHeuristic-v1"]
    }

@router.post("/ml/rollback")
async def rollback_weights(current_user=Depends(get_current_user_with_org)):
    """
    Reverts to previous weights stored in learning_updates.
    """
    db = get_database()
    last_update = db["learning_updates"].find_one(
        {"org_id": current_user.org_id}, sort=[("timestamp", -1)]
    )
    if not last_update:
        raise HTTPException(404, "No previous updates found to rollback")
        
    old = last_update["old_weights"]
    db["engine_config"].update_one(
        {"org_id": current_user.org_id},
        {"$set": {"W_LLM": old["W_LLM"], "W_RULE": old["W_RULE"], "last_rollback": datetime.utcnow()}}
    )
    return {"ok": True, "restored_weights": old}

@router.get("/orgs/schedule-suggestion")
async def schedule_suggestion(lead_id: str, current_user=Depends(get_current_user_with_org)):
    return {"top_hours": get_schedule_suggestion(current_user.org_id, lead_id)}

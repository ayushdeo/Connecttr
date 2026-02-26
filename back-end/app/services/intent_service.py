import os
import re
import uuid
import requests
import math
import time
from typing import List, Dict, Any
from datetime import datetime, timedelta
from pymongo import UpdateOne

from app.db import get_leads_collection, get_campaigns_collection, get_database
from app.services.email_service import upsert_leads_to_hub
from app.services.perplexity_client import classify_intent

# Conf
EMAILHUB_URL = os.getenv("EMAILHUB_URL", "http://localhost:8000")

from app.ml.predict import predict_conversion_probability

def calculate_composite_score(
    rule_score: float,
    llm_score: float,
    engagement_data: dict,
    org_id: str = "default",
    weights: dict = None
) -> float:
    """
    Phase 3: Uses dynamic weights if available.
    """
    if not weights:
        from app.services.model_registry import ModelRegistry
        registry = ModelRegistry(get_database())
        weights = registry.get_weights(org_id)
        
    W_RULE = weights.get("W_RULE", 0.3)
    W_LLM = weights.get("W_LLM", 0.5)
    W_ENGAGEMENT = weights.get("W_ENGAGEMENT", 0.2)
    
    e_score = min(100.0, (engagement_data.get("clicks", 0) * 40) + (engagement_data.get("opens", 0) * 10))
    
    composite = (rule_score * W_RULE) + (llm_score * W_LLM) + (e_score * W_ENGAGEMENT)
    
    if engagement_data.get("replies", 0) > 0:
        composite *= 1.5
        
    return float(max(0.0, min(100.0, round(composite, 2))))

def clean_text(text: str) -> str:
    if not text: return ""
    text = text.lower()
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def classify_kind(lead: Dict) -> str:
    """
    Generalized kind classification. 
    Focuses on excluding staffing/job posts.
    """
    t = f"{lead.get('title','')} {lead.get('snippet','')} {lead.get('clean_text','')}".lower()
    url = (lead.get("url") or "").lower()
    
    JOB_DOMAINS = ("linkedin.com/jobs", "indeed.com", "glassdoor", "ziprecruiter", "roberthalf", "aquent", "talent", "careers")
    JOB_TOKENS = (
        r"\b(full[- ]?time|part[- ]?time|contract|contractor|freelance role|shift|benefits|apply now|join our team)\b",
        r"\b(hiring|we are hiring|job opening|position|role|recruit(?:ing|er)?)\b",
    )
    
    if any(d in url for d in JOB_DOMAINS): return "staffing_job"
    if any(re.search(rx, t) for rx in JOB_TOKENS): return "staffing_job"
    return "buyer_candidate" if len(lead.get("clean_text", "")) >= 8 else "other"

def get_domain_engagement(email: str, org_id: str) -> dict:
    if not email or "@" not in email:
        return {}
    domain = email.split("@")[-1].lower()
    db = get_database()
    emails_col = db["emails"]
    
    # Count opens/clicks for this domain in this org
    pipeline = [
        {"$match": {"lead_id": {"$exists": True}, "direction": "outbound"}}, # This is simplified
    ]
    # For now, let's keep it simple: return 0s unless we have a domain-engagement collection
    return {"opens": 0, "clicks": 0, "replies": 0}

def run_intent_pipeline(campaign_id: str = "default"):
    collection = get_leads_collection()
    db = get_database()
    
    raw_leads = list(collection.find({}))
    if not raw_leads:
        return {"processed": 0, "message": "No leads found"}

    campaigns_coll = get_campaigns_collection()
    campaign = campaigns_coll.find_one({"id": campaign_id})
    brief = campaign.get("brief", {}) if campaign else {}
    lead_signals = brief.get("lead_signals", [])
    
    bulk_ops = []
    processed_count = 0
    
    from app.services.model_registry import ModelRegistry
    registry = ModelRegistry(db)
    org_weights_cache = {}

    for lead in raw_leads:
        if lead.get("campaign_id") != campaign_id and campaign_id != "default":
            continue

        org_id = lead.get("org_id", "default")
        
        if org_id not in org_weights_cache:
            org_weights_cache[org_id] = registry.get_weights(org_id)
        current_weights = org_weights_cache[org_id]
        
        combined = f"{lead.get('title','')} {lead.get('snippet','')}"
        c_text = clean_text(combined)
        
        # 2. Rule Score with Signal Reinforcement
        r_score = 0.0
        matched_sigs = []
        if lead_signals:
            for sig in lead_signals:
                if sig.lower() in c_text:
                    matched_sigs.append(sig)
                    sw = db["signal_weights"].find_one({"org_id": org_id, "signal_type": sig})
                    boost = sw.get("weight_boost", 0.0) if sw else 0.0
                    r_score += (25.0 + (boost * 100))
            r_score = min(100.0, r_score)

        # 3. Signals & Kind
        signal_time = lead.get("created_at") or time.time()
        recency_factor = math.exp(-((time.time() - signal_time) / 86400) / 30)
        r_score *= recency_factor

        eng_data = get_domain_engagement(lead.get("email", ""), org_id)
        
        # Adaptive Persona
        role = lead.get("role", "")
        persona_mult = {
            "Founder": 1.2, "CEO": 1.15, "VP": 1.1, "CMO": 1.1, "Head": 1.05
        }.get(role, 1.0)
        r_score = min(100.0, r_score * persona_mult)
        
        kind = classify_kind({**lead, "clean_text": c_text})
        
        # 4. LLM Tiering
        llm_score = lead.get("llm_score") or (lead.get("perplexity_score", 0.0) * 100)
        reasoning = "N/A"
        
        if kind == "buyer_candidate":
            if r_score > 85.0:
                if not llm_score: llm_score = 90.0
                reasoning = "Auto-approved."
            elif 40.0 <= r_score <= 85.0:
                if not llm_score and len(c_text) > 5:
                    intent_res = classify_intent(c_text, brief)
                    llm_score = float(intent_res.get("intent_score", 0))
                    reasoning = intent_res.get("reasoning", "")
            else:
                llm_score = llm_score or 10.0
                reasoning = "Low rule score skip."

        # 5. Composite Score (Dynamic Weights)
        final_score = calculate_composite_score(r_score, llm_score, eng_data, org_id, weights=current_weights)
        
        # 5A. Phase 3: Conversion Probability
        hour_now = datetime.utcnow().hour
        p_conv = predict_conversion_probability(lead, {
            "rule_score": r_score, "llm_score": llm_score, "hour_of_send": hour_now
        })

        intent_label = "Low"
        if final_score >= 70: intent_label = "High"
        elif final_score >= 50: intent_label = "Medium"

        update_fields = {
            "clean_text": c_text, "kind": kind,
            "rule_score": float(r_score), "llm_score": float(llm_score),
            "final_score": float(final_score), "intent_label": intent_label,
            "ai_reasoning": reasoning,
            "predicted_conversion_probability": p_conv,
            "last_processed_at": datetime.utcnow()
        }
        
        bulk_ops.append(UpdateOne({"_id": lead["_id"]}, {"$set": update_fields}))
        processed_count += 1

        # Push to Hub if qualified
        email = lead.get("email")
        if kind == "buyer_candidate" and email and final_score >= 50:
            if lead.get("status") == "New" or not lead.get("status"):
                payload = [{
                    "id": str(lead.get("id") or lead.get("_id") or uuid.uuid4().hex),
                    "campaign_id": campaign_id,
                    "name": lead.get("contact_name") or lead.get("title") or "Unknown",
                    "email": email,
                    "score": int(final_score),
                    "status": "New"
                }]
                upsert_leads_to_hub(payload)

    if bulk_ops:
        collection.bulk_write(bulk_ops)

    return {"processed": processed_count, "message": "Pipeline completed via batch update"}

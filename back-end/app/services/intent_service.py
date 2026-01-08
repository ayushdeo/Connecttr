import os
import re
import uuid
import requests
from typing import List, Dict

from app.db import get_leads_collection
from app.services.email_service import upsert_leads_to_hub
from app.services.perplexity_client import score_intent_freeform

# Conf
EMAILHUB_URL = os.getenv("EMAILHUB_URL", "http://localhost:8000")

def clean_text(text: str) -> str:
    if not text: return ""
    text = text.lower()
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def classify_kind(lead: Dict) -> str:
    # ... logic from Intent.py ...
    t = f"{lead.get('title','')} {lead.get('snippet','')} {lead.get('clean_text','')}".lower()
    url = (lead.get("url") or "").lower()
    
    JOB_DOMAINS = ("linkedin.com/jobs", "indeed.com", "glassdoor", "ziprecruiter", "roberthalf", "aquent", "talent", "careers")
    JOB_TOKENS = (
        r"\b(full[- ]?time|part[- ]?time|contract|contractor|freelance role|shift|benefits|apply now|join our team)\b",
        r"\b(hiring|we are hiring|job opening|position|role|recruit(?:ing|er)?)\b",
        r"\bphotographer\b.*\b(hiring|position|role|apply)\b",
    )
    SUPPLIER_TOKENS = (
        r"\b(my portfolio|portfolio link|book me|now booking|my rates|rate card|shoots available|taking bookings)\b",
        r"\bI (shot|photographed|covered) (?:yesterday|last week|last night|today)\b",
    )
    
    if any(d in url for d in JOB_DOMAINS): return "staffing_job"
    if any(re.search(rx, t) for rx in JOB_TOKENS): return "staffing_job"
    if any(re.search(rx, t) for rx in SUPPLIER_TOKENS): return "supplier_promo"
    return "event_buyer_candidate" if len(lead.get("clean_text", "")) >= 8 else "other"

def run_intent_pipeline(campaign_id: str = "default"):
    """
    Refactored Intent.py logic.
    1. Fetch unprocessed leads.
    2. Normalize/Clean.
    3. Feature Extract/Score.
    4. Save updates.
    5. Push qualified to EmailHub (via API call, or internal logic).
    """
    collection = get_leads_collection()
    
    # Optional: fetch only leads that need processing? 
    # For now, replicate existing behavior: fetch all, process all. 
    # Efficiency Note: Should ideally filter `{"final_score": {"$exists": False}}`
    raw_leads = list(collection.find({}))
    if not raw_leads:
        return {"processed": 0, "message": "No leads found"}

    processed_count = 0
    updated_count = 0
    
    # Features Config
    keyword_map = {
        "mentions_hiring": ["hiring photographer", "photographer needed", "looking for photographer", "need a photographer"],
        "mentions_event": ["wedding", "shoot", "event", "pre wedding", "party", "function", "ceremony", "studio"],
        "mentions_urgency": ["urgent", "asap", "immediate", "this week", "today", "tomorrow"],
        "mentions_commercial": ["brand", "product", "campaign", "ecommerce", "content team", "promo", "volume"],
    }
    
    for lead in raw_leads:
        # 1. Preprocess
        combined = f"{lead.get('title','')} {lead.get('snippet','')}"
        c_text = clean_text(combined)
        
        # 2. Features
        stats = {k: any(kw in c_text for kw in kws) for k, kws in keyword_map.items()}
        
        # 3. Rule Score
        r_score = 0.0
        r_score += 0.4 if stats["mentions_hiring"] else 0.0
        r_score += 0.3 if stats["mentions_event"] else 0.0
        r_score += 0.2 if stats["mentions_commercial"] else 0.0
        r_score += 0.1 if stats["mentions_urgency"] else 0.0
        r_score = round(max(0.0, min(1.0, r_score)), 2)

        # 4. Kind
        # Create temp dict for classification
        tmp_lead = {**lead, "clean_text": c_text, **stats}
        kind = classify_kind(tmp_lead)
        
        # 5. LLM Score (only if event buyer)
        p_score = lead.get("perplexity_score", 0.0)
        final_score = 0.0
        intent_label = "Low"

        # Weights
        W_RULE, W_LLM = 0.4, 0.6
        
        if kind == "event_buyer_candidate":
            # If not already scored or forcing re-score...
            if not p_score and len(c_text) > 5:
                # Call Perplexity
                p_score_val = score_intent_freeform(c_text)
                p_score = p_score_val if p_score_val is not None else 0.05
            
            final_score = round((W_RULE * r_score) + (W_LLM * p_score), 2)
            
            if final_score >= 0.70: intent_label = "High"
            elif final_score >= 0.50: intent_label = "Medium"
            
        elif kind == "staffing_job":
            r_score, p_score, final_score = 0.10, 0.05, 0.25
            intent_label = "Medium (Staffing/Job)"
        elif kind == "supplier_promo":
            r_score, p_score, final_score = 0.05, 0.05, 0.10
            intent_label = "Low (Supplier/Promo)"
        else:
            final_score = 0.05

        # 6. Update MongoDB
        update_fields = {
            "clean_text": c_text,
            "kind": kind,
            "rule_score": r_score,
            "perplexity_score": p_score,
            "final_score": final_score,
            "intent_label": intent_label,
            **stats 
        }
        
        collection.update_one({"_id": lead["_id"]}, {"$set": update_fields})
        updated_count += 1
        processed_count += 1
        
# import moved to top

        # 7. Auto-Push to EmailHub logic
        email = lead.get("email")
        if kind == "event_buyer_candidate" and email:
            if lead.get("status") == "New" or not lead.get("status"):
               try:
                    score_pct = int(final_score * 100)
                    payload = [{
                        "id": str(lead.get("id") or lead.get("_id") or uuid.uuid4().hex),
                        "campaign_id": campaign_id,
                        "name": lead.get("contact_name") or lead.get("title") or "Unknown",
                        "company": "",
                        "role": "",
                        "email": email,
                        "score": score_pct,
                        "status": "New"
                    }]
                    # Direct service call - no HTTP
                    upsert_leads_to_hub(payload)
               except Exception as e:
                   print(f"Failed to push to emailhub: {e}")

    return {"processed": processed_count, "recategorized": updated_count}

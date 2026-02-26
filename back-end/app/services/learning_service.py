import os
import time
from datetime import datetime, timedelta
from typing import Dict, Any

from app.db import get_database, get_leads_collection, get_emails_collection, get_audit_collection

# ENV Toggle
LEARNING_MODE = os.getenv("LEARNING_MODE", "off").lower() == "on"

def run_reinforcement_tuner(org_id: str):
    """
    Reinforcement Signal Tuner.
    Adjusts Intent Scoring Weights (W_LLM, W_RULE) and signal-specific weights
    based on observed vs predicted performance.
    """
    db = get_database()
    leads_col = get_leads_collection()
    emails_col = get_emails_collection()
    
    # 1. Pull engagement data for last 14 days
    lookback_days = 14
    start_date = datetime.utcnow() - timedelta(days=lookback_days)
    
    # Meaningful engagement check
    # We count leads that reached 'Sent' status in this org
    sent_leads_q = {"org_id": org_id, "status": {"$in": ["Sent", "Opened", "Clicked", "Responded", "Bounced"]}}
    sent_leads = list(leads_col.find(sent_leads_q))
    
    if len(sent_leads) < 30:
        return {"status": "skipped", "reason": f"Insufficient data: {len(sent_leads)} leads found (min 30)"}

    # observed conversion rate (replies/sent)
    replies = len([l for l in sent_leads if l.get("status") == "Responded"])
    total_sent = len(sent_leads)
    
    r_obs = replies / total_sent if total_sent > 0 else 0
    
    # predicted conversion rate (avg final_score / 100)
    # This is a heuristic prediction (if final_score=70, we expect 0.7 probability is high, 
    # but actual response rate might be 0.1).
    # In Phase 3, we compare relative changes.
    avg_score = sum([l.get("final_score", 0) for l in sent_leads]) / total_sent
    r_pred = avg_score / 100.0
    
    # 2. Adjust Weights (Global Heuristic)
    # If observed is much lower than predicted, maybe LLM is overconfident or rules are weak.
    # Discrepancy threshold
    THRESHOLD = 0.05 
    delta = r_obs - r_pred
    
    weight_update = {}
    
    # We maintain these in a 'config' or 'org_settings' collection?
    # For now, let's assume they live in an 'engine_config' per org.
    config_col = db["engine_config"]
    config = config_col.find_one({"org_id": org_id}) or {
        "org_id": org_id,
        "W_LLM": 0.5,
        "W_RULE": 0.3,
        "W_ENGAGEMENT": 0.2
    }
    
    old_w_llm = config.get("W_LLM", 0.5)
    old_w_rule = config.get("W_RULE", 0.3)
    
    new_w_llm = old_w_llm
    new_w_rule = old_w_rule

    if abs(delta) > THRESHOLD:
        if delta < 0:
            # Over-predicted: LLM might be too lenient. Reduce LLM weight slightly?
            new_w_llm = max(0.1, old_w_llm - 0.01)
            new_w_rule = min(0.8, old_w_rule + 0.01)
        else:
            # Under-predicted: Rule based might be too conservative. Boost LLM.
            new_w_llm = min(0.8, old_w_llm + 0.01)
            new_w_rule = max(0.1, old_w_rule - 0.01)
            
    # 3. Signal-Specific Tuning
    # For signals strongly correlated with positive replies
    signal_updates = []
    # (Simplified: find signals present in 'Responded' leads but rare in others)
    # This logic would be more complex; for now we implement the 'learning' skeleton.
    
    # 4. Persistence & Audit
    update_doc = {
        "org_id": org_id,
        "timestamp": datetime.utcnow(),
        "delta": delta,
        "old_weights": {"W_LLM": old_w_llm, "W_RULE": old_w_rule},
        "new_weights": {"W_LLM": new_w_llm, "W_RULE": new_w_rule},
        "r_obs": r_obs,
        "r_pred": r_pred,
        "applied": LEARNING_MODE
    }
    
    if LEARNING_MODE:
        config_col.update_one(
            {"org_id": org_id},
            {"$set": {"W_LLM": new_w_llm, "W_RULE": new_w_rule, "last_tuned": datetime.utcnow()}},
            upsert=True
        )
        db["learning_updates"].insert_one(update_doc)
        
        # Log to Audit
        get_audit_collection().insert_one({
            "org_id": org_id,
            "action": "weight_tuning",
            "details": f"W_LLM: {old_w_llm}->{new_w_llm}, W_RULE: {old_w_rule}->{new_w_rule}",
            "timestamp": datetime.utcnow()
        })
        
    return update_doc

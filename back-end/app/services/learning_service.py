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
    
    from app.core.learning_config import LearningConfig
    from app.services.model_registry import ModelRegistry

    # Meaningful engagement check
    # We count leads that reached 'Sent' status in this org
    sent_leads_q = {"org_id": org_id, "status": {"$in": ["Sent", "Opened", "Clicked", "Responded", "Bounced"]}}
    sent_leads = list(leads_col.find(sent_leads_q))
    
    if len(sent_leads) < LearningConfig.LEARN_MIN_EVENTS:
        return {"status": "skipped", "reason": f"Insufficient data: {len(sent_leads)} leads found (min {LearningConfig.LEARN_MIN_EVENTS})" }

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
    error = r_obs - r_pred
    
    weight_update = {}
    
    registry = ModelRegistry(db)
    weights = registry.get_weights(org_id)
    
    old_w_llm = weights.get("W_LLM", 0.5)
    old_w_rule = weights.get("W_RULE", 0.3)
    w_engagement = weights.get("W_ENGAGEMENT", 0.2)
    
    new_w_llm = old_w_llm
    new_w_rule = old_w_rule

    if abs(error) > THRESHOLD:
        def clamp(val, min_val, max_val):
            return max(min_val, min(max_val, val))
            
        def sign(x):
            return 1 if x > 0 else -1 if x < 0 else 0
            
        learning_rate = LearningConfig.LEARNING_RATE
        delta = learning_rate * abs(error) * sign(error)

        new_w_llm = clamp(
            old_w_llm + delta,
            LearningConfig.MIN_WEIGHT,
            LearningConfig.MAX_WEIGHT
        )

        new_w_rule = clamp(
            old_w_rule - delta,
            LearningConfig.MIN_WEIGHT,
            LearningConfig.MAX_WEIGHT
        )
            
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
        registry.update_weights(org_id, {
            "W_LLM": round(new_w_llm, 4),
            "W_RULE": round(new_w_rule, 4),
            "W_ENGAGEMENT": w_engagement
        })
        db["learning_updates"].insert_one(update_doc)
        
        # Log to Audit
        get_audit_collection().insert_one({
            "org_id": org_id,
            "action": "weight_tuning",
            "details": f"W_LLM: {old_w_llm}->{new_w_llm}, W_RULE: {old_w_rule}->{new_w_rule}",
            "timestamp": datetime.utcnow()
        })
        
    return update_doc

import random
from typing import Dict, List, Any
from app.db import get_database

def compute_beta_sample(alpha: float, beta: float) -> float:
    """
    Simple Beta distribution sampler using random.betavariate.
    """
    return random.betavariate(alpha, beta)

def run_promotion_check(org_id: str, campaign_id: str):
    """
    Statistical Template Promotion.
    P(Variant Best) > 0.95 -> Promote.
    """
    db = get_database()
    tp_col = db["template_performance"]
    
    variants = list(tp_col.find({"org_id": org_id, "campaign_id": campaign_id}))
    if len(variants) < 2:
        return {"status": "skipped", "reason": "Need at least 2 variants"}

    # Minimum samples for statistical significance
    MIN_SAMPLES = 50
    
    # 1. Calculate P(Variant best) via Thompson Sampling simulation
    num_samples = 1000
    scores = {v["template_variant"]: 0 for v in variants}
    
    for _ in range(num_samples):
        draws = []
        for v in variants:
            # Beta(alpha, beta)
            # alpha = positive_replies + 1, beta = sent - positive_replies + 1
            alpha = v.get("positive_replies", 0) + 1
            beta = v.get("sent", 0) - v.get("positive_replies", 0) + 1
            draws.append((v["template_variant"], compute_beta_sample(alpha, beta)))
        
        # Who won this draw?
        winner = max(draws, key=lambda x: x[1])[0]
        scores[winner] += 1
        
    # probabilities
    probabilities = {k: v / num_samples for k, v in scores.items()}
    
    # 2. Check for winner
    promoted = None
    for variant, prob in probabilities.items():
        v_data = next(v for v in variants if v["template_variant"] == variant)
        if prob > 0.95 and v_data.get("sent", 0) >= MIN_SAMPLES:
            promoted = variant
            break
            
    if promoted:
        # LOG PROMOTION
        db["template_performance"].update_many(
            {"org_id": org_id, "campaign_id": campaign_id},
            {"$set": {"is_promoted": False}} # Reset others
        )
        db["template_performance"].update_one(
            {"org_id": org_id, "campaign_id": campaign_id, "template_variant": promoted},
            {"$set": {"is_promoted": True, "promotion_date": datetime.utcnow()}}
        )
        
        # LOG to Audit
        db["audit_logs"].insert_one({
            "org_id": org_id,
            "campaign_id": campaign_id,
            "action": "template_promotion",
            "details": f"Variant {promoted} promoted with P={probabilities[promoted]:.1%}",
            "timestamp": datetime.utcnow()
        })
        
    return {
        "probabilities": probabilities,
        "promoted": promoted
    }

from datetime import datetime

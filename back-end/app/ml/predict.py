import math
from typing import Dict, Any

def predict_conversion_probability(lead: Dict[str, Any], features: Dict[str, Any]) -> float:
    """
    Phase 3: Conversion Probability Model.
    Initially uses a logistical-heuristic approach before full model training.
    Features: rule_score, llm_score, role, hour_of_send.
    """
    # Weights for probability model
    # (These would be learned from 'model_registry' artifacts in a full ML deploy)
    W_RULE = 0.2
    W_LLM = 0.4
    W_PERSONA = 0.2
    W_TIME = 0.2
    
    r_score = features.get("rule_score", 0) / 100.0
    l_score = features.get("llm_score", 0) / 100.0
    
    # Persona Weight
    role = lead.get("role", "")
    persona_score = {
        "Founder": 0.9, "CEO": 0.85, "VP": 0.8, "Manager": 0.6
    }.get(role, 0.5)
    
    # Timing (Best hours 9-11 and 14-16)
    hour = features.get("hour_of_send", 10)
    time_score = 1.0 if (9 <= hour <= 11 or 14 <= hour <= 16) else 0.5
    
    # Logit calculation
    z = (r_score * W_RULE) + (l_score * W_LLM) + (persona_score * W_PERSONA) + (time_score * W_TIME)
    
    # Sigmoid to get probability [0, 1]
    # We shift it so 0.5 z results in ~0.5 probability? 
    # Standard sigmoid: 1 / (1 + exp(-k(z - z0)))
    prob = 1 / (1 + math.exp(-10 * (z - 0.5)))
    
    return float(round(prob, 4))

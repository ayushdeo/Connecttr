from typing import List, Dict, Any
from app.db import get_database

def get_schedule_suggestion(org_id: str, lead_id: str) -> List[int]:
    """
    Phase 3: Bayesian Send-Time Suggestions.
    Suggests top-3 hours based on org_send_profiles.
    """
    db = get_database()
    profile = db["org_send_profiles"].find_one({"org_id": org_id})
    
    if not profile or not profile.get("engagement_timestamps"):
        # Fallback to business hours 9-11, 14-16
        return [10, 11, 14]

    # Calculate frequency of engagement per hour
    hours = [t["hour"] for t in profile["engagement_timestamps"] if t["event"] in ("click", "reply")]
    
    if not hours:
        return [10, 11, 14]

    counts = {}
    for h in hours:
        counts[h] = counts.get(h, 0) + 1
        
    # Bayesian Prior: Add pseudo-counts for standard business hours
    for h in [9, 10, 11, 14, 15, 16]:
        counts[h] = counts.get(h, 0) + 2
        
    # Sort by frequency
    sorted_hours = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [h[0] for h in sorted_hours[:3]]

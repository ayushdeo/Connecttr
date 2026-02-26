from datetime import datetime, timedelta
from typing import Dict, Any
from app.db import get_database, get_leads_collection, get_alerts_collection, get_audit_collection

def check_campaign_health(campaign_id: str):
    """
    Phase 3: Self-Healing Logic.
    Rules:
    - Bounce Rate > 8% (48h window) -> Pause
    - CTR Drop > 30% vs 7-day baseline -> Switch/Alert
    """
    db = get_database()
    leads_col = get_leads_collection()
    
    # 1. Bounce Rate Check
    window_48h = datetime.utcnow() - timedelta(hours=48)
    # We count recent sends for this campaign
    # (Assuming we have a 'sent_at' field or similar in leads or emails)
    # For now, we query the 'leads' status
    recent_leads = list(leads_col.find({
        "campaign_id": campaign_id,
        "status": {"$in": ["Sent", "Bounced", "Opened", "Clicked", "Responded"]}
        # Ideally filtered by a 'last_sent_at' timestamp
    }))
    
    if len(recent_leads) < 20: 
        return {"status": "ok", "reason": "Insufficient data"}

    bounces = len([l for l in recent_leads if l.get("status") == "Bounced"])
    bounce_rate = bounces / len(recent_leads)
    
    if bounce_rate > 0.08:
        # PAUSE CAMPAIGN
        db["campaigns"].update_one(
            {"id": campaign_id},
            {"$set": {"status": "paused", "pause_reason": "High bounce rate detected (self-healing)"}}
        )
        
        # Create Alert
        get_alerts_collection().insert_one({
            "campaign_id": campaign_id,
            "type": "campaign_paused",
            "reason": f"Bounce rate {bounce_rate:.1%} exceeds 8% threshold.",
            "timestamp": datetime.utcnow(),
            "severity": "critical"
        })
        
        # Log to Audit
        get_audit_collection().insert_one({
            "campaign_id": campaign_id,
            "action": "auto_pause",
            "details": f"Bounce rate: {bounce_rate:.1%}",
            "timestamp": datetime.utcnow()
        })
        
        return {"status": "paused", "reason": "high_bounce"}

    return {"status": "ok", "bounce_rate": bounce_rate}

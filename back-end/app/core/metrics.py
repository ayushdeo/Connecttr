import time
from typing import Dict, Any
from app.db import get_database

def track_performance_metric(org_id: str, metric_name: str, value: float, metadata: Dict = None):
    """
    Unified performance tracking for Phase 3.
    """
    db = get_database()
    db["performance_metrics"].insert_one({
        "org_id": org_id,
        "metric": metric_name,
        "value": value,
        "metadata": metadata or {},
        "timestamp": time.time()
    })

def log_audit_event(org_id: str, campaign_id: str, action: str, details: str):
    """
    Centralized audit logging.
    """
    db = get_database()
    db["campaign_audit_logs"].insert_one({
        "org_id": org_id,
        "campaign_id": campaign_id,
        "action": action,
        "details": details,
        "timestamp": time.time()
    })

from app.db import get_leads_collection, get_database, get_audit_collection
from fastapi import HTTPException
from datetime import datetime

def check_send_limits(user_id: str, org_id: str, limit: int = 50):
    """
    Abuse Protection: Enforce daily send limits.
    """
    db = get_database()
    usage_col = db["usage_stats"]
    
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    key = f"emails:{org_id}:{user_id}:{today_str}"
    
    # Atomic increment
    res = usage_col.find_one_and_update(
        {"_id": key},
        {"$inc": {"count": 1}, "$setOnInsert": {"org_id": org_id, "user_id": user_id, "date": today_str}},
        upsert=True,
        return_document=True
    )
    
    if res["count"] > limit:
        # Audit Log violation
        get_audit_collection().insert_one({
            "org_id": org_id,
            "user_id": user_id,
            "action": "limit_exceeded",
            "resource": "email",
            "metadata": {"limit": limit, "count": res["count"]},
            "timestamp": datetime.utcnow()
        })
        raise HTTPException(status_code=429, detail=f"Daily email limit reached ({limit}/day).")

def upsert_leads_to_hub(leads_data: list[dict], org_id: str = None) -> int:
    """
    Directly inserts/updates leads in MongoDB 'leads' collection
    following Email Hub logic (upsert by id/email).
    Returns count of new/updated leads.
    """
    collection = get_leads_collection()
    count = 0
    
    for lead_dict in leads_data:
        # Determine unique key: id or email
        filter_q = {}
        if lead_dict.get("id"):
            filter_q["id"] = lead_dict["id"]
        elif lead_dict.get("email"):
            filter_q["email"] = lead_dict["email"]
        else:
            continue # skip invalid
            
        # SAAS SAFETY: If updating existing, verify org_id matches!
        # Ideally, we scope query by org_id.
        if org_id:
            filter_q["org_id"] = org_id
            
        # Inject org_id into data
        if org_id:
            lead_dict["org_id"] = org_id
            
        if "status" not in lead_dict:
            lead_dict["status"] = "New"

        # Defaults for sequence control
        if "sequence_active" not in lead_dict:
            lead_dict["sequence_active"] = True
        if "do_not_contact" not in lead_dict:
            lead_dict["do_not_contact"] = False
        if "sequence_reason_stopped" not in lead_dict:
            lead_dict["sequence_reason_stopped"] = None
            
        result = collection.update_one(
            filter_q,
            {"$set": lead_dict},
            upsert=True
        )
        if result.upserted_id or result.modified_count > 0:
            count += 1
            
    return count

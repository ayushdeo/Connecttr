from app.db import get_leads_collection

def upsert_leads_to_hub(leads_data: list[dict]) -> int:
    """
    Directly inserts/updates leads in MongoDB 'leads' collection
    following Email Hub logic (upsert by id/email).
    Returns count of new/updated leads.
    """
    collection = get_leads_collection()
    count = 0
    
    for lead_dict in leads_data:
        # Determine unique key: id or email
        # The logic in email_hub.py was:
        # existing = {(l["id"], l["email"]) for l in db["leads"]}
        # This is a bit loose.
        # Let's standardize: Upsert by 'id' if present, else 'email'.
        
        filter_q = {}
        if lead_dict.get("id"):
            filter_q["id"] = lead_dict["id"]
        elif lead_dict.get("email"):
            filter_q["email"] = lead_dict["email"]
        else:
            continue # skip invalid
            
        # We want to merge fields, not overwrite perfectly? 
        # API says "import", usually implies create or update.
        # We'll use $set to update provided fields.
        
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

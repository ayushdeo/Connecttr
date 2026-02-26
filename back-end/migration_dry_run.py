import os, sys, json
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

# Path setup
sys.path.append(os.getcwd())
load_dotenv(".env")

from app.db import get_database

def migration_dry_run():
    print("--- 🔍 SaaS Migration Dry-Run Mapping ---")
    db = get_database()
    
    users = list(db.users.find({"org_id": {"$exists": False}}))
    campaigns = list(db.campaigns.find({"org_id": {"$exists": False}}))
    leads = list(db.leads.find({"org_id": {"$exists": False}}))
    
    mapping = {
        "users_found": len(users),
        "orphaned_campaigns": len(campaigns),
        "orphaned_leads": len(leads),
        "hypothetical_orgs": []
    }
    
    if not users:
        print("No users found needing migration.")
        return mapping

    # Simulate mapping
    for user in users:
        mapping["hypothetical_orgs"].append({
            "user_email": user.get("email"),
            "org_name": f"{user.get('name', 'User')}'s Organization",
            "assigned_campaigns": [],
            "assigned_leads_count": 0
        })
    
    # Heuristic: Assign all to first user for now (Admin heuristic)
    if mapping["hypothetical_orgs"]:
        target = mapping["hypothetical_orgs"][0]
        target["assigned_campaigns"] = [c.get("id") or str(c.get("_id")) for c in campaigns]
        target["assigned_leads_count"] = len(leads)
        
    print(json.dumps(mapping, indent=2))
    
    with open("migration_mapping_dry_run.json", "w") as f:
        json.dump(mapping, f, indent=2)

if __name__ == "__main__":
    migration_dry_run()

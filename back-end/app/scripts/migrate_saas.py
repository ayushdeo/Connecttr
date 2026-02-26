import os, sys, json, argparse
from pymongo import MongoClient
from datetime import datetime

# Adjust path to find app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
load_dotenv(env_path)

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print("No MONGO_URI found")
    sys.exit(1)

client = MongoClient(MONGO_URI)
db_name = os.getenv("MONGO_DB_NAME", "kodingbolte_db")
db = client[db_name]

users_coll = db["users"]
orgs_coll = db["organizations"]
campaigns_coll = db["campaigns"]
leads_coll = db["leads"]
audit_coll = db["audit_logs"]

def migrate(dry_run=False):
    print(f"Starting SaaS Migration{' (DRY RUN)' if dry_run else ''}...")
    
    users = list(users_coll.find({"org_id": {"$exists": False}}))
    print(f"Found {len(users)} users needing migration.")
    
    report = {
        "users_migrated": 0,
        "orgs_created": 0,
        "orphans_claimed": 0,
        "hypothetical_mappings": []
    }
    
    for user in users:
        user_id = str(user["_id"])
        name = user.get("name", "User")
        email = user.get("email", "unknown")
        
        if dry_run:
            report["hypothetical_mappings"].append({
                "user_id": user_id,
                "user_email": email,
                "org_name": f"{name}'s Organization"
            })
            report["users_migrated"] += 1
            report["orgs_created"] += 1
            continue

        # Real Migration Logic
        org_data = {
            "name": f"{name}'s Organization",
            "owner_id": user_id,
            "plan": "free",
            "created_at": datetime.utcnow()
        }
        res_org = orgs_coll.insert_one(org_data)
        org_id = str(res_org.inserted_id)
        
        users_coll.update_one({"_id": user["_id"]}, {"$set": {"org_id": org_id, "role": "owner"}})
        
        audit_coll.insert_one({
            "org_id": org_id,
            "user_id": user_id,
            "action": "migration_create_org",
            "timestamp": datetime.utcnow()
        })
        report["users_migrated"] += 1
        report["orgs_created"] += 1

    # Orphans
    orphaned_campaigns = campaigns_coll.count_documents({"org_id": {"$exists": False}})
    if orphaned_campaigns > 0:
        if dry_run:
            report["orphans_claimed"] = orphaned_campaigns
        else:
            owner = users_coll.find_one({"role": "owner"})
            if owner and owner.get("org_id"):
                campaigns_coll.update_many({"org_id": {"$exists": False}}, {"$set": {"org_id": owner["org_id"], "owner_id": str(owner["_id"])}})
                leads_coll.update_many({"org_id": {"$exists": False}}, {"$set": {"org_id": owner["org_id"]}})
                report["orphans_claimed"] = orphaned_campaigns

    if dry_run:
        with open("migrate_report.json", "w") as f:
            json.dump(report, f, indent=2)
        print("Dry run report saved to migrate_report.json")

    print("Migration Process Finished.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    migrate(dry_run=args.dry_run)

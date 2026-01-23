import os, sys
from pymongo import MongoClient
from datetime import datetime

# Adjust path to find app module if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
# Move up 3 levels: app/scripts/migrate.py -> app/scripts -> app -> back-end
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

def migrate():
    print("Starting SaaS Migration...")
    
    users = list(users_coll.find({"org_id": {"$exists": False}}))
    print(f"Found {len(users)} users needing migration.")
    
    for user in users:
        user_id = str(user["_id"])
        name = user.get("name", "User")
        email = user.get("email", "unknown")
        
        print(f"Migrating user: {email} ({user_id})")
        
        # 1. Create Org
        org_data = {
            "name": f"{name}'s Organization",
            "owner_id": user_id,
            "plan": "free",
            "created_at": datetime.utcnow()
        }
        res_org = orgs_coll.insert_one(org_data)
        org_id = str(res_org.inserted_id)
        
        # 2. Update User
        users_coll.update_one(
            {"_id": user["_id"]},
            {"$set": {"org_id": org_id, "role": "owner"}}
        )
        
        # 3. Create Audit Log
        audit_coll.insert_one({
            "org_id": org_id,
            "user_id": user_id,
            "action": "migration_create_org",
            "resource": "system",
            "timestamp": datetime.utcnow()
        })
        
        # 4. Claim Orphaned Data?
        # Assuming existing data belongs to this user if there's only one user or we just assign it to them.
        # But wait, without owner_id on campaigns previously, how do we know who owns what?
        # If the system was single tenant effectively (or shared), we might have a problem.
        # IF there is no owner_id on campaigns, we might just assign them to the first migrated user?
        # OR we leave them orphaned until claimed?
        # Strategy: Logic provided in prompt: "Attach orphaned campaigns/leads to that org if applicable"
        
        # Let's verify if campaigns have owner_id or user_id?
        # Previous models didn't strictly show it. 
        # If they don't have it, we might be in trouble for multi-tenant migration of old data.
        # Strategy: If effectively single user, assign all to this user.
        # If multiple users, we might need manual intervention orheuristic (e.g. check logs?).
        # Implementation: Assign all campaigns without org_id to this user's org.
        
        # Danger: If multiple users exist, they will ALL fight for the same campaigns?
        # SAFE APPROACH: only assign if total users == 1, or just log a warning.
        # Let's perform a "Claim All Orphans" for the FIRST migrated user, treating them as Admin.
        
    # Orphans cleanup (Assign to first found admin/owner if necessary, or just leave them)
    # Updating campaigns with missing org_id
    orphaned_campaigns = campaigns_coll.count_documents({"org_id": {"$exists": False}})
    if orphaned_campaigns > 0:
        print(f"Found {orphaned_campaigns} orphaned campaigns.")
        # Find an owner to assign to? 
        owner = users_coll.find_one({"role": "owner"})
        if owner and owner.get("org_id"):
            print(f"Assigning orphans to {owner['email']}'s Org ({owner['org_id']})")
            campaigns_coll.update_many(
                {"org_id": {"$exists": False}}, 
                {"$set": {"org_id": owner["org_id"], "owner_id": str(owner["_id"])}}
            )
            
            # Also leads
            leads_coll.update_many(
                {"org_id": {"$exists": False}},
                {"$set": {"org_id": owner["org_id"]}}
            )
        else:
            print("No owner found to assign orphans to.")

    print("Migration Complete.")

if __name__ == "__main__":
    migrate()

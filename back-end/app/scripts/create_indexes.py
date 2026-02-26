import os
import pymongo
from dotenv import load_dotenv

# Load env in case we run this standalone
load_dotenv(".env") 

# Direct import if running from back-end root, or adjust path
try:
    from app.db import get_leads_collection, get_emails_collection, get_campaigns_collection, get_database
except ImportError:
    # Fallback for running script directly inside app/scripts
    import sys
    sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))
    from app.db import get_leads_collection, get_emails_collection, get_campaigns_collection, get_database

def create_indexes():
    print("Creating indexes...")
    
    # LEADS
    leads = get_leads_collection()
    # url should be unique to prevent duplicates
    leads.create_index("url", unique=True)
    # indexes for querying
    leads.create_index("email")
    leads.create_index("campaign_id")
    leads.create_index("status")
    # Compound index for campaign-agnostic pipeline speed
    leads.create_index([("org_id", 1), ("campaign_id", 1), ("status", 1)])
    leads.create_index("final_score")
    print(" Leads indexes created.")

    # EMAILS
    emails = get_emails_collection()
    emails.create_index("lead_id")
    emails.create_index("campaign_id")
    emails.create_index("provider_msg_id")
    print(" Emails indexes created.")

    # CAMPAIGNS
    campaigns = get_campaigns_collection()
    campaigns.create_index("id", unique=True)
    print(" Campaigns indexes created.")

    # ORGANIZATIONS
    orgs = get_database()["organizations"]
    orgs.create_index("owner_id")
    print(" Organizations indexes created.")

    # INVITES
    invites = get_database()["org_invites"]
    invites.create_index([("email", pymongo.ASCENDING), ("status", pymongo.ASCENDING)])
    invites.create_index("token", unique=True)
    print(" Invites indexes created.")

    # BEHAVIORAL: Template Performance
    tp = get_database()["template_performance"]
    tp.create_index([("org_id", 1), ("campaign_id", 1)])
    tp.create_index("template_variant")
    print(" Template Performance indexes created.")

    # BEHAVIORAL: Send Profiles
    sp = get_database()["org_send_profiles"]
    sp.create_index("org_id", unique=True)
    print(" Send Profiles indexes created.")

    # BEHAVIORAL: Signal Weights
    sw = get_database()["signal_weights"]
    sw.create_index([("org_id", 1), ("signal_type", 1)])
    print(" Signal Weights indexes created.")

    # Phase 3: Learning & Reinforcement
    lu = get_database()["learning_updates"]
    lu.create_index([("org_id", 1), ("timestamp", -1)])
    print(" Learning Updates indexes created.")

    # Phase 3: Model Registry
    mr = get_database()["model_registry"]
    mr.create_index("model_id", unique=True)
    print(" Model Registry indexes created.")

    # Phase 3: Campaign Audit Logs
    cal = get_database()["campaign_audit_logs"]
    cal.create_index([("campaign_id", 1), ("timestamp", -1)])
    print(" Campaign Audit Logs indexes created.")

    print("Done.")

if __name__ == "__main__":
    create_indexes()

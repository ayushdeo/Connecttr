import os
import pymongo
from dotenv import load_dotenv

# Load env in case we run this standalone
load_dotenv("../apiKey.env") 

# Direct import if running from back-end root, or adjust path
try:
    from app.db import get_leads_collection, get_emails_collection, get_campaigns_collection
except ImportError:
    # Fallback for running script directly inside app/scripts
    import sys
    sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))
    from app.db import get_leads_collection, get_emails_collection, get_campaigns_collection

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

    print("Done.")

if __name__ == "__main__":
    create_indexes()

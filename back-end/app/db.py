import os
from pymongo import MongoClient
import pymongo

# Default to None to enforce explicit configuration in production
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "kodingbolte_db")

_client = None

def get_client():
    global _client
    if _client is None:
        if not MONGO_URI:
            # Fallback for local dev convenience ONLY if explicitly defaulting, 
            # but user requested removal of reliance on default.
            # We will raise error to force Render config.
            raise ValueError("MONGO_URI environment variable is not set. Cannot connect to MongoDB.")
            
        _client = MongoClient(MONGO_URI)
    return _client

def get_database():
    client = get_client()
    return client[DB_NAME]

def get_leads_collection():
    return get_database()["leads"]

def get_emails_collection():
    return get_database()["emails"]

def get_campaigns_collection():
    return get_database()["campaigns"]

def get_users_collection():
    return get_database()["users"]


import os
from pymongo import MongoClient
import pymongo

# Default to local if not set
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("MONGO_DB_NAME", "kodingbolte_db")

_client = None

def get_client():
    global _client
    if _client is None:
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

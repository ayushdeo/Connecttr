# app/Intent.py (drop-in)
import os
import re
from typing import List, Dict

from dotenv import load_dotenv
load_dotenv("apiKey.env")  # loads PERPLEXITY_API_KEY, etc.

from app.services.perplexity_client import score_intent_freeform
from app.db import get_leads_collection

# =========================
# Config
# =========================
EMAILHUB_URL = os.getenv("EMAILHUB_URL", "http://localhost:8000")
CAMPAIGN_ID  = os.getenv("CAMPAIGN_ID", "demo")  # set per-campaign

print("KEY_VISIBLE?", bool(os.getenv("PERPLEXITY_API_KEY")))

# =========================
# FA: Load Raw Leads
# =========================
def load_leads() -> List[Dict]:
    """Fetch all leads from MongoDB that haven't been fully processed or need re-check."""
    collection = get_leads_collection()
    # For now, just load all. In production, you might filter by 'processed': False
    leads = list(collection.find({}))
    return leads

# =========================
# FB: Preprocessing
# =========================
def clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\x00-\x7F]+", " ", text)   # strip emojis / non-ascii
    text = re.sub(r"https?://\S+", " ", text)    # strip urls
    text = re.sub(r"[^\w\s]", " ", text)         # punctuation -> space
    text = re.sub(r"\s+", " ", text)             # collapse spaces
    return text.strip()

def preprocess_leads(leads: List[Dict]) -> List[Dict]:
    processed = []
    for lead in leads:
        # Depending on if 'clean_text' is already there, we might re-compute
        combined = f"{lead.get('title','')} {lead.get('snippet','')}"
        
        # We don't want to mutate the dict in place inside the loop if we want to return a new list,
        # but for MongoDB updates it's easier to modify and then bulk write.
        # Here we just return the modified list for the next step.
        lead["clean_text"] = clean_text(combined)
        lead["raw_title"] = lead.get("title", "")
        lead["raw_snippet"] = lead.get("snippet", "")
        processed.append(lead)
    return processed

# =========================
# FC: Feature Extraction
# =========================
def extract_features(processed_leads: List[Dict]) -> List[Dict]:
    keyword_map = {
        "mentions_hiring": [
            "hiring photographer", "photographer needed", "looking for photographer", "need a photographer",
        ],
        "mentions_event": [
            "wedding", "shoot", "event", "pre wedding", "party", "function", "ceremony", "studio",
        ],
        "mentions_urgency": ["urgent", "asap", "immediate", "this week", "today", "tomorrow"],
        "mentions_commercial": ["brand", "product", "campaign", "ecommerce", "content team", "promo", "volume"],
    }

    out = []
    for lead in processed_leads:
        text = lead["clean_text"]
        feats = {k: any(kw in text for kw in kws) for k, kws in keyword_map.items()}
        lead.update(feats)
        out.append(lead)
    return out

# =========================
# Kind classifier (route leads before LLM)
# =========================
JOB_DOMAINS = (
    "linkedin.com/jobs", "indeed.com", "glassdoor", "ziprecruiter",
    "roberthalf", "aquent", "talent", "careers"
)
JOB_TOKENS = (
    r"\b(full[- ]?time|part[- ]?time|contract|contractor|freelance role|shift|benefits|apply now|join our team)\b",
    r"\b(hiring|we are hiring|job opening|position|role|recruit(?:ing|er)?)\b",
    r"\bphotographer\b.*\b(hiring|position|role|apply)\b",
)
SUPPLIER_TOKENS = (
    r"\b(my portfolio|portfolio link|book me|now booking|my rates|rate card|shoots available|taking bookings)\b",
    r"\bI (shot|photographed|covered) (?:yesterday|last week|last night|today)\b",
)

def classify_kind(lead: Dict) -> str:
    """
    Return one of: event_buyer_candidate | staffing_job | supplier_promo | other
    """
    t = f"{lead.get('raw_title','')} {lead.get('raw_snippet','')} {lead.get('clean_text','')}".lower()
    url = (lead.get("url") or "").lower()

    # staffing / job boards
    if any(d in url for d in JOB_DOMAINS):
        return "staffing_job"
    if any(re.search(rx, t) for rx in JOB_TOKENS):
        return "staffing_job"

    # supplier promos (photographers advertising themselves)
    if any(re.search(rx, t) for rx in SUPPLIER_TOKENS):
        return "supplier_promo"

    # otherwise candidate for event buying (LLM will refine)
    return "event_buyer_candidate" if len(lead.get("clean_text", "")) >= 8 else "other"

# =========================
# FD1: Rule-Based Scoring
# =========================
def rule_based_score(lead: Dict) -> float:
    score = 0.0
    score += 0.4 if lead.get("mentions_hiring") else 0.0
    score += 0.3 if lead.get("mentions_event") else 0.0
    score += 0.2 if lead.get("mentions_commercial") else 0.0
    score += 0.1 if lead.get("mentions_urgency") else 0.0
    return round(max(0.0, min(1.0, score)), 2)

# =========================
# FD2: Perplexity Prompt Scoring (via client)
# =========================
# The client function `score_intent_freeform(text)` should implement the
# “two-decimal number only” + mini-rubric prompt. We call it directly here.

# =========================
# FE: Combine Scores
# =========================
W_RULE = 0.4
W_LLM  = 0.6
EVENT_HIGH = 0.70
EVENT_MED  = 0.50

def aggregate_scores(lead: Dict, rule_weight: float = W_RULE, perplexity_weight: float = W_LLM):
    r_score = rule_based_score(lead)
    try:
        if lead.get("perplexity_score", 0.0) > 0:
             # avoid re-running if already scored, or force re-run?
             # For now, simplistic: always re-run if script is called manually
            pass
        
        p_score = score_intent_freeform(lead["clean_text"])  # returns float in [0,1]
        if p_score is None:
            p_score = 0.05
    except Exception as e:
        print(f"[Perplexity] fallback 0.05 due to error: {e}")
        p_score = 0.05

    final_score = round((rule_weight * r_score + perplexity_weight * p_score), 2)
    return r_score, p_score, final_score

# =========================
# FF: Thresholding + Labeling
# =========================
def label_intent(score: float) -> str:
    if score >= 0.75:
        return "High"
    elif score >= 0.5:
        return "Medium"
    else:
        return "Low"

# =========================
# FG: Output Classified Leads (Update MongoDB)
# =========================
def update_classified_leads(leads: List[Dict]):
    collection = get_leads_collection()
    updates = 0
    for lead in leads:
        # fields to update
        update_fields = {
            "clean_text": lead.get("clean_text"),
            "mentions_hiring": lead.get("mentions_hiring"),
            "mentions_event": lead.get("mentions_event"),
            "mentions_urgency": lead.get("mentions_urgency"),
            "mentions_commercial": lead.get("mentions_commercial"),
            "rule_score": lead.get("rule_score"),
            "perplexity_score": lead.get("perplexity_score"),
            "final_score": lead.get("final_score"),
            "intent_label": lead.get("intent_label"),
            "kind": lead.get("kind"),
        }
        collection.update_one({"_id": lead["_id"]}, {"$set": update_fields})
        updates += 1
    print(f"Updated {updates} leads in MongoDB.")

# =========================
# Push Qualified Leads to Email Hub (optional)
# =========================
import uuid
import requests

def push_leads_to_emailhub():
    collection = get_leads_collection()
    # Find leads that are event_buyer_candidate AND has email AND not synced?
    # Logic in old code: "status": "New"
    
    # We will fetch leads from MongoDB
    cursor = collection.find({
        "kind": "event_buyer_candidate",
        "email": {"$exists": True, "$ne": ""} # Ensure email exists and not empty
    })
    
    leads_to_push = []
    for row in cursor:
        try:
            fs = float(row.get("final_score", 0))
            score_pct = int(fs * 100) if fs <= 1 else int(fs)
        except Exception:
            score_pct = 0
        
        leads_to_push.append({
            "id": str(row.get("_id")), # Use mongo ID as lead ID or keep uuid? 
            # If we want to maintain consistency, we should probably generate a UUID for the lead 
            # at creation time or just use stringified _id. 
            # For now, let's use a new UUID if 'id' field doesnt exist, else use it.
            # But the email hub expects 'id'. 
            "id": row.get("id") or uuid.uuid4().hex,
            "campaign_id": CAMPAIGN_ID,
            "name": row.get("contact_name") or row.get("title") or "Unknown",
            "company": row.get("company") or "",
            "role": row.get("role") or "",
            "email": row.get("email"),
            "score": score_pct,
            "status": row.get("status", "New"),
        })

    if not leads_to_push:
        print("[EmailHub] No importable leads (missing email or not buyer candidates).")
        return

    r = requests.post(f"{EMAILHUB_URL}/emailhub/leads/import", json=leads_to_push, timeout=30)
    r.raise_for_status()
    print(f"[EmailHub] Imported {len(leads_to_push)} leads into Email Hub.")

# =========================
# RUN FULL PIPELINE
# =========================
if __name__ == "__main__":
    raw_leads = load_leads()
    print(f"[FA] Loaded {len(raw_leads)} leads from MongoDB")

    if not raw_leads:
        print("No leads to process.")
        exit(0)

    processed_leads = preprocess_leads(raw_leads)
    print(f"[FB] Preprocessed")

    featured_leads = extract_features(processed_leads)
    print(f"[FC] Feature extraction complete")

    final_leads: List[Dict] = []
    
    # We can batch update or update one by one. In memory calculation first.
    
    for lead in featured_leads:
        kind = classify_kind(lead)

        if kind == "event_buyer_candidate":
            r_score, p_score, final_score = aggregate_scores(lead)  # rule + LLM
            if   final_score >= EVENT_HIGH: intent_label = "High"
            elif final_score >= EVENT_MED:  intent_label = "Medium"
            else:                           intent_label = "Low"

        elif kind == "staffing_job":
            r_score, p_score, final_score = 0.10, 0.05, 0.25
            intent_label = "Medium (Staffing/Job)"

        elif kind == "supplier_promo":
            r_score, p_score, final_score = 0.05, 0.05, 0.10
            intent_label = "Low (Supplier/Promo)"

        else:  # other/empty/garbled
            r_score, p_score, final_score = 0.00, 0.00, 0.05
            intent_label = "Low"

        # Update the dict object
        lead["rule_score"] = r_score
        lead["perplexity_score"] = p_score
        lead["final_score"] = final_score
        lead["intent_label"] = intent_label
        lead["kind"] = kind
        
        final_leads.append(lead)

    update_classified_leads(final_leads)
    print(f"[FG] Done updated MongoDB")

    # Preview first few rows in console
    for lead in final_leads[:3]:
        print("\n--- Classified Lead ---")
        print(f"URL      : {lead.get('url')}")
        print(f"Score    : {lead.get('final_score')} ({lead.get('intent_label')})")
        print(f"Title    : {lead.get('title')}")
        print(f"Snippet  : {lead.get('snippet')}")

    # Optional: push to Email Hub (will skip rows without email)
    push_leads_to_emailhub()

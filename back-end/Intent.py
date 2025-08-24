# app/Intent.py (drop-in)
import csv
import os
import re
from typing import List, Dict

from dotenv import load_dotenv
load_dotenv("apiKey.env")  # loads PERPLEXITY_API_KEY, etc.

from app.services.perplexity_client import score_intent_freeform

# =========================
# Config
# =========================
BASE_DIR = os.path.dirname(__file__)
DEFAULT_IN = os.path.join(BASE_DIR, "data", "cleaned_leads.csv")
DEFAULT_OUT = os.path.join(BASE_DIR, "classified_leads.csv")

EMAILHUB_URL = os.getenv("EMAILHUB_URL", "http://localhost:8000")
CAMPAIGN_ID  = os.getenv("CAMPAIGN_ID", "demo")  # set per-campaign

print("KEY_VISIBLE?", bool(os.getenv("PERPLEXITY_API_KEY")))

# =========================
# FA: Load Raw Leads
# =========================
def load_leads(csv_file: str = DEFAULT_IN) -> List[Dict]:
    # Try fallback to local file if the "data/" path doesn't exist.
    candidates = [csv_file, os.path.join(BASE_DIR, "cleaned_leads.csv")]
    path = next((p for p in candidates if os.path.exists(p)), None)
    if not path:
        raise FileNotFoundError(f"cleaned_leads.csv not found in {candidates}")
    leads = []
    with open(path, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            leads.append({
                "title": row.get("Name/Title") or "",
                "url": row.get("Profile URL") or "",
                "snippet": row.get("Snippet") or "",
            })
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
        combined = f"{lead['title']} {lead['snippet']}"
        processed.append({
            "url": lead["url"],
            "clean_text": clean_text(combined),
            "raw_title": lead["title"],
            "raw_snippet": lead["snippet"],
        })
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
        out.append({**lead, **feats})
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
# FG: Output Classified Leads
# =========================
def write_classified_leads(leads: List[Dict], output_csv: str = DEFAULT_OUT):
    fieldnames = [
        "url", "raw_title", "raw_snippet", "clean_text",
        "mentions_hiring", "mentions_event", "mentions_urgency", "mentions_commercial",
        "rule_score", "perplexity_score", "final_score", "intent_label", "kind"
    ]
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for lead in leads:
            writer.writerow(lead)

# =========================
# Push Qualified Leads to Email Hub (optional)
# =========================
import uuid
import requests

def push_leads_to_emailhub(csv_path: str = DEFAULT_OUT):
    leads = []
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only send real buyer candidates and rows that already have an email
            if (row.get("kind") != "event_buyer_candidate") or not row.get("email"):
                continue
            try:
                score_pct = int(float(row.get("final_score", "0")) * 100) if float(row.get("final_score", "0")) <= 1 else int(float(row.get("final_score", "0")))
            except Exception:
                score_pct = 0
            leads.append({
                "id": uuid.uuid4().hex,
                "campaign_id": CAMPAIGN_ID,
                "name": row.get("contact_name") or row.get("raw_title") or "Unknown",
                "company": row.get("company") or "",
                "role": row.get("role") or "",
                "email": row.get("email"),
                "score": score_pct,
                "status": "New",
            })
    if not leads:
        print("[EmailHub] No importable leads (missing email or not buyer candidates).")
        return

    r = requests.post(f"{EMAILHUB_URL}/emailhub/leads/import", json=leads, timeout=30)
    r.raise_for_status()
    print(f"[EmailHub] Imported {len(leads)} leads into Email Hub.")

# =========================
# RUN FULL PIPELINE
# =========================
if __name__ == "__main__":
    raw_leads = load_leads()
    print(f"[FA] Loaded {len(raw_leads)} leads")

    processed_leads = preprocess_leads(raw_leads)
    print(f"[FB] Preprocessed")

    featured_leads = extract_features(processed_leads)
    print(f"[FC] Feature extraction complete")

    final_leads: List[Dict] = []
    for lead in featured_leads:
        kind = classify_kind(lead)

        if kind == "event_buyer_candidate":
            r_score, p_score, final_score = aggregate_scores(lead)  # rule + LLM
            if   final_score >= EVENT_HIGH: intent_label = "High"
            elif final_score >= EVENT_MED:  intent_label = "Medium"
            else:                           intent_label = "Low"

        elif kind == "staffing_job":
            # Don’t waste LLM calls; keep a small fixed score, distinct label
            r_score, p_score, final_score = 0.10, 0.05, 0.25
            intent_label = "Medium (Staffing/Job)"

        elif kind == "supplier_promo":
            r_score, p_score, final_score = 0.05, 0.05, 0.10
            intent_label = "Low (Supplier/Promo)"

        else:  # other/empty/garbled
            r_score, p_score, final_score = 0.00, 0.00, 0.05
            intent_label = "Low"

        final_leads.append({
            **lead,
            "rule_score": r_score,
            "perplexity_score": p_score,
            "final_score": final_score,
            "intent_label": intent_label,
            "kind": kind,
        })

    write_classified_leads(final_leads, DEFAULT_OUT)
    print(f"[FG] Done → {DEFAULT_OUT}")

    # Preview first few rows in console
    for lead in final_leads[:3]:
        print("\n--- Classified Lead ---")
        print(f"URL      : {lead['url']}")
        print(f"Score    : {lead['final_score']} ({lead['intent_label']})")
        print(f"Title    : {lead['raw_title']}")
        print(f"Snippet  : {lead['raw_snippet']}")

    # Optional: push to Email Hub (will skip rows without email)
    push_leads_to_emailhub(DEFAULT_OUT)
import requests
import urllib.parse
from bs4 import BeautifulSoup
import os
from app.db import get_leads_collection  # Updated import

# ------------------- CONFIG -------------------
token = "581dfd2df9df4230be008481a7014cbf3a0dbbcd8d2"

search_query = (
    '('
    '"need a photographer" OR "looking for a photographer" OR "recommend a photographer" OR '
    '"photographer for" OR "book a photographer" OR "wedding photographer needed" OR '
    '"product shoot" OR "brand shoot" OR ("need" AND "photographer" AND ("today" OR "this week" OR "this month" OR "urgent"))'
    ') '
    'site:linkedin.com (inurl:posts OR inurl:feed/update OR inurl:activity) '
    '-inurl:/jobs/ -inurl:/jobs/view -inurl:/jobs -intitle:"hiring"'
)

# ----------------------------------------------

# Helpers ------------------------------------------------------------
BAD_URL_PARTS = (
    "linkedin.com/jobs", "/jobs/", "/jobs/view", "indeed.", "glassdoor.",
    "ziprecruiter.", "lensa.", "roberthalf.", "aquent."
)

def is_candidate_url(u: str) -> bool:
    u = (u or "").lower()
    if any(p in u for p in BAD_URL_PARTS):
        return False
    # Prefer social “post” endpoints
    return ("linkedin.com/posts/" in u) or ("linkedin.com/feed/update" in u) or ("linkedin.com/pulse/" in u) or ("linkedin.com/activity" in u)

def sanitize_text(s: str | None) -> str:
    return " ".join((s or "").split())

# -------------------------------------------------------------------

# Step 1: Encode and send request to Google via Scrape.do
print("Requesting Google search via Scrape.do...")
google_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(search_query)}&num=20&hl=en"
encoded_target = urllib.parse.quote(google_url, safe="")
url = f"http://api.scrape.do/?token={token}&url={encoded_target}&render=true"

resp = requests.get(url, timeout=30)
resp.raise_for_status()

# Step 2: Parse Google HTML results
soup = BeautifulSoup(resp.text, "html.parser")
# tF2Cxc is the standard result wrapper; include 'div.g' as a fallback
results = soup.select("div.tF2Cxc") or soup.select("div.g")
print("Found results:", len(results))

# Step 3: Load existing profile URLs for deduplication
collection = get_leads_collection()
existing_urls = set(doc["url"] for doc in collection.find({}, {"url": 1}))

# Step 4: Write new results to MongoDB
new_rows = 0

for result in results:
    try:
        link_tag = result.select_one("a")
        title_tag = result.select_one("h3")
        snippet_tag = result.select_one(".VwiC3b") or result.select_one(".IsZvec")

        if not (link_tag and title_tag):
            continue

        profile_url = link_tag.get("href", "")
        if not is_candidate_url(profile_url):
            continue  # drop job boards / careers / staffing

        if profile_url in existing_urls:
            continue

        title = sanitize_text(title_tag.get_text(strip=True))
        snippet = sanitize_text(snippet_tag.get_text(strip=True) if snippet_tag else "")

        doc = {
            "title": title,
            "url": profile_url,
            "snippet": snippet,
            # Add default fields for later stages
            "clean_text": "",
            "mentions_hiring": False,
            "mentions_event": False,
            "mentions_urgency": False,
            "mentions_commercial": False,
            "rule_score": 0.0,
            "perplexity_score": 0.0,
            "final_score": 0.0,
            "intent_label": "Unprocessed",
            "kind": "unknown"
        }
        
        collection.insert_one(doc)
        
        existing_urls.add(profile_url)
        new_rows += 1

    except Exception as e:
        print(f"Skipped one result due to error: {e}")

print(f"Added {new_rows} new leads to MongoDB.")
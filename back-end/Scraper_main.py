import requests
import urllib.parse
from bs4 import BeautifulSoup
import csv
import os

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

# Write into back-end/data/cleaned_leads.csv (creates folder if missing)
BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
csv_path = os.path.join(DATA_DIR, "cleaned_leads.csv")
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
existing_urls = set()
if os.path.exists(csv_path):
    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        try:
            for row in csv.DictReader(f):
                existing_urls.add(row.get("Profile URL") or row.get("url") or "")
        except Exception:
            pass  # tolerate partially written files

# Step 4: Write new results to CSV
fieldnames = ["Name/Title", "Profile URL", "Snippet"]
new_rows = 0
with open(csv_path, "a", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    if not os.path.exists(csv_path) or os.stat(csv_path).st_size == 0:
        writer.writeheader()

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

            writer.writerow({
                "Name/Title": title,
                "Profile URL": profile_url,
                "Snippet": snippet
            })
            existing_urls.add(profile_url)
            new_rows += 1

        except Exception as e:
            print(f"Skipped one result due to error: {e}")

print(f"Wrote {new_rows} new rows to {csv_path}")
# app/services/lead_discovery.py
import os, uuid, urllib.parse, requests, logging, re
from bs4 import BeautifulSoup
from urllib.parse import urlparse

log = logging.getLogger("nexus")

SCRAPEDO_TOKEN = os.getenv("SCRAPEDO_TOKEN") or os.getenv("SCRAPE_DO_TOKEN")
SOCIAL_HOSTS = {"linkedin.com","www.linkedin.com","twitter.com","x.com","reddit.com","www.reddit.com"}
EXCLUDE_DOMAINS_DEFAULT = {
    # aggregators/competitors
    "peerspace.com","tagvenue.com","giggster.com","yelp.com","tripadvisor.com","coworkingcafe.com",
    # platforms (not buyer emails)
    "facebook.com","instagram.com","pinterest.com","tiktok.com","linktr.ee","linktree.com",
    # job boards
    "indeed.com","glassdoor.com","linkedin.com/jobs",
}

VENDOR_TOKENS = {
    "studio rental","studio rentals","rentals","video studio","props","gear rental",
    "best studio","top studios","our studios","pricing","book now","reserve",
}
DEMAND_TOKENS = {"looking for","need","seeking","recommend","studio availability","rent a studio","book a studio","space for a shoot"}

def _domain(u: str) -> str:
    try:
        return (urlparse(u).netloc or "").lower()
    except Exception:
        return ""

def _google_results(query: str, max_results: int = 8):
    if not SCRAPEDO_TOKEN:
        raise RuntimeError("SCRAPEDO_TOKEN missing")
    encoded_query = urllib.parse.quote("https://www.google.com/search?q=" + query)
    url = f"http://api.scrape.do/?token={SCRAPEDO_TOKEN}&url={encoded_query}&render=true"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for card in soup.select("div.tF2Cxc")[:max_results]:
        a = card.select_one("a"); h3 = card.select_one("h3")
        s = card.select_one(".VwiC3b") or card.select_one(".IsZvec")
        if a and h3:
            yield {
                "url": a.get("href"),
                "title": h3.get_text(" ", strip=True),
                "snippet": (s.get_text(" ", strip=True) if s else ""),
            }

def _geo_from_brief(brief: dict):
    blob = " ".join([
        " ".join(brief.get("services") or []),
        " ".join(brief.get("search_queries") or []),
        brief.get("icp_summary") or "",
        brief.get("geo") or "",
    ]).lower()
    geos = []
    for g in ["nyc","new york","brooklyn","queens","manhattan","la","los angeles","chicago","miami","austin","seattle","sf","san francisco","london","toronto"]:
        if g in blob: geos.append(g)
    return geos or ["nyc","new york","los angeles","la"]

def _site_scopes():
    return [
        'site:linkedin.com (inurl:posts OR inurl:feed/update) -inurl:/jobs -inurl:/company',
        'site:twitter.com OR site:x.com',
        'site:reddit.com',
    ]

def _q(s: str) -> str:
    s = (s or "").strip().replace('"','')
    return f'"{s}"' if s else ""

def _queries_from_lead_signals(lead_signals, geos):
    if not lead_signals: return []
    demand = [f'"{t}"' for t in sorted(DEMAND_TOKENS)]
    scopes = _site_scopes()
    qs = []
    for sig in lead_signals:
        sig_q = _q(sig)
        if not sig_q: continue
        for g in (geos or [""]):
            geo_q = _q(g) if g else ""
            for scope in scopes:
                parts = [scope, f"({sig_q})", f"({' OR '.join(demand)})"]
                if geo_q: parts.append(f"({geo_q})")
                qs.append(" ".join(parts))
    # de-dupe
    seen, out = set(), []
    for x in qs:
        if x not in seen:
            out.append(x); seen.add(x)
    return out

def _exclude(hit, client_domain, exclude_domains):
    d = _domain(hit["url"])
    if client_domain and client_domain in d:
        return True
    if any(bad in d for bad in exclude_domains):
        return True
    # if not social and looks like a vendor/listing, exclude
    text = (hit["title"] + " " + hit["snippet"]).lower()
    looks_vendor = any(tok in text for tok in VENDOR_TOKENS)
    if d not in SOCIAL_HOSTS and looks_vendor:
        return True
    return False

def _score(hit, geos):
    """
    Heuristic quality score in [0..1]
    + social result: +0.45
    + demand token: +0.25
    + geo mention:  +0.15
    - vendor terms: -0.40
    clamp to [0,1]
    """
    d = _domain(hit["url"])
    text = (hit["title"] + " " + hit["snippet"]).lower()

    s = 0.0
    if d in SOCIAL_HOSTS: s += 0.45
    if any(tok in text for tok in DEMAND_TOKENS): s += 0.25
    if any(g for g in geos if g in text): s += 0.15
    if any(tok in text for tok in VENDOR_TOKENS): s -= 0.40
    return max(0.0, min(1.0, s))

def discover_from_brief(campaign_id: str, brief: dict, per_query: int = 6):
    client_domain = _domain(brief.get("client_website") or "")
    exclude_domains = set(brief.get("exclude_domains") or []) | EXCLUDE_DOMAINS_DEFAULT
    geos = _geo_from_brief(brief)
    signals = brief.get("lead_signals") or []
    queries = _queries_from_lead_signals(signals, geos)

    log.info(f"[discover] queries_built={len(queries)} geos={geos}")

    leads, seen = [], set()
    for q in queries:
        for hit in _google_results(q, per_query):
            if hit["url"] in seen: 
                continue
            if _exclude(hit, client_domain, exclude_domains):
                continue
            d = _domain(hit["url"])
            if d not in SOCIAL_HOSTS:
                continue  # keep social only
            sc = _score(hit, geos)

            t_lower = hit["title"].lower()
            role = ""
            if "founder" in t_lower or "co-founder" in t_lower: role = "Founder"
            elif "ceo" in t_lower: role = "CEO"
            elif "vp" in t_lower or "vice president" in t_lower: role = "VP"
            elif "director" in t_lower: role = "Director"
            elif "manager" in t_lower: role = "Manager"
            elif "coordinator" in t_lower: role = "Coordinator"

            leads.append({
                "id": uuid.uuid4().hex,
                "campaign_id": campaign_id,
                "name": hit["title"][:120] or "Unknown",
                "company": d.replace("www.",""),
                "role": role,
                "email": None,
                "score": int(round(sc * 100)),  # 0..100 for UI
                "status": "New",
                "source_url": hit["url"],
                "snippet": hit["snippet"],
            })
            seen.add(hit["url"])
    return leads

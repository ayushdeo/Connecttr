import os, uuid, urllib.parse, requests, logging
from bs4 import BeautifulSoup
from urllib.parse import urlparse

log = logging.getLogger("nexus")

SOCIAL_HOSTS = {"linkedin.com","www.linkedin.com","twitter.com","x.com","reddit.com","www.reddit.com"}
EXCLUDE_DOMAINS_DEFAULT = {
    # platforms (not buyer emails)
    "facebook.com","instagram.com","pinterest.com","tiktok.com","linktr.ee","linktree.com",
    # job boards
    "indeed.com","glassdoor.com","linkedin.com/jobs",
}

def _domain(u: str) -> str:
    try:
        return (urlparse(u).netloc or "").lower()
    except Exception:
        return ""

def _google_results(query: str, max_results: int = 8):
    # Dynamic token evaluation to avoid 500 crashes
    token = os.getenv("SCRAPEDO_TOKEN")
    if not token:
        raise RuntimeError("SCRAPEDO_TOKEN missing")
    
    encoded_query = urllib.parse.quote("https://www.google.com/search?q=" + query)
    url = f"http://api.scrape.do/?token={token}&url={encoded_query}&render=true"
    r = requests.get(url, timeout=40)
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

def _exclude(hit, client_domain, exclude_domains, brief):
    d = _domain(hit["url"])
    if client_domain and client_domain in d:
        return True
    if any(bad in d for bad in exclude_domains):
        return True
    
    # Check AI exclusion terms
    text = (hit["title"] + " " + hit["snippet"]).lower()
    for bad_term in brief.get("exclude_terms", []):
        if str(bad_term).lower() in text:
            return True
            
    return False

def _score(hit, brief):
    """
    Heuristic quality score in [0..1]
    Scores dynamically based on overlap with the AI brief's lead_signals and core services.
    """
    d = _domain(hit["url"])
    text = (hit["title"] + " " + hit["snippet"]).lower()

    s = 0.0
    if d in SOCIAL_HOSTS: 
        s += 0.35
        
    lead_signals = [str(x).lower() for x in brief.get("lead_signals", [])]
    services = [str(x).lower() for x in brief.get("services", [])]
    
    # Check for intent overlap
    valuable_hits = 0
    for sig in lead_signals:
        if sig in text: valuable_hits += 1
    for srv in services:
        if srv in text: valuable_hits += 1
        
    if valuable_hits > 0:
        s += min(0.65, valuable_hits * 0.15)
        
    return max(0.0, min(1.0, s))

def discover_from_brief(campaign_id: str, brief: dict, per_query: int = 6):
    client_domain = _domain(brief.get("client_website") or "")
    
    # Normalize AI exclude_domains
    exclude_domains = set()
    for item in brief.get("exclude_domains") or []:
        string_item = str(item)
        domain = _domain(string_item) if "://" in string_item else string_item.lower()
        if domain: exclude_domains.add(domain)
    exclude_domains |= EXCLUDE_DOMAINS_DEFAULT

    # Rely purely on the AI generated search structures
    queries = brief.get("search_queries", [])
    if not queries:
        queries = [f'site:linkedin.com (inurl:posts OR inurl:update) "{s}"' for s in brief.get("services", ["software"])]

    log.info(f"[discover] executing {len(queries)} pure AI search paths without geographical limits")

    leads, seen = [], set()
    total_q = len(queries)
    
    for i, q in enumerate(queries):
        pct = int(100 * (i / max(1, total_q)))
        yield {"type": "progress", "progress": pct, "step": f"Scraping logic loop {i+1}/{total_q}..."}
        
        for hit in _google_results(q, per_query):
            if hit["url"] in seen: 
                continue
            if _exclude(hit, client_domain, exclude_domains, brief):
                continue
            d = _domain(hit["url"])
            if d not in SOCIAL_HOSTS:
                continue
            
            sc = _score(hit, brief)

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
                "url": hit["url"], # Fixes E11000 null duplicate key
                "snippet": hit["snippet"],
            })
            seen.add(hit["url"])
            
    yield {"type": "result", "leads": leads}
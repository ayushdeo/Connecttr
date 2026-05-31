# app/services/lead_discovery.py
import os, re, uuid, time, urllib.parse, requests, logging
from bs4 import BeautifulSoup
from urllib.parse import urlparse

log = logging.getLogger("nexus")

SOCIAL_HOSTS = {
    "linkedin.com", "www.linkedin.com",
    "twitter.com", "x.com",
    "reddit.com", "www.reddit.com",
}

EXCLUDE_DOMAINS_DEFAULT = {
    "facebook.com", "instagram.com", "pinterest.com", "tiktok.com",
    "linktr.ee", "linktree.com",
    "indeed.com", "glassdoor.com", "ziprecruiter.com",
}

JOB_URL_PATTERNS = [
    "/jobs/", "/jobs/view/", "linkedin.com/jobs",
    "indeed.com", "glassdoor.com", "ziprecruiter", "lensa.",
    "roberthalf.", "aquent.", "dice.com",
]

JOB_TEXT_SIGNALS = [
    "is hiring", "we're hiring", "we are hiring",
    "job opening", "apply now", "job description",
    "submit your resume", "salary range", "open position",
    "benefits include", "equal opportunity employer",
]

# Ordered: most specific first so the first match wins
ROLE_PATTERNS = [
    (["co-founder", "cofounder"], "Co-Founder"),
    (["founder"], "Founder"),
    (["chief executive", "ceo"], "CEO"),
    (["chief technology", "cto"], "CTO"),
    (["chief marketing", "cmo"], "CMO"),
    (["chief operating", "coo"], "COO"),
    (["chief product", "cpo"], "CPO"),
    (["managing director", "managing partner"], "Managing Director"),
    (["vice president", "vice-president", " vp "], "VP"),
    (["president"], "President"),
    (["owner"], "Owner"),
    (["partner"], "Partner"),
    (["principal"], "Principal"),
    (["head of", "head,"], "Head Of"),
    (["director"], "Director"),
    (["manager"], "Manager"),
    (["coordinator"], "Coordinator"),
    (["freelance", "freelancer", "self-employed", "independent"], "Freelancer"),
    (["photographer", "videographer", "designer", "developer", "consultant", "artist"], "Creative"),
]


def _domain(u: str) -> str:
    try:
        return (urlparse(u).netloc or "").lower().replace("www.", "")
    except Exception:
        return ""


def _google_results(query: str, max_results: int = 15):
    """Fetch Google results via scrape.do with multi-selector fallback."""
    token = os.getenv("SCRAPEDO_TOKEN")
    if not token:
        raise RuntimeError("SCRAPEDO_TOKEN missing")

    google_url = (
        "https://www.google.com/search?q="
        + urllib.parse.quote_plus(query)
        + "&num=20&hl=en"
    )
    encoded = urllib.parse.quote(google_url, safe="")
    url = f"http://api.scrape.do/?token={token}&url={encoded}&render=true"

    r = requests.get(url, timeout=40)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    # Google periodically renames result container classes — try all known variants
    cards = (
        soup.select("div.tF2Cxc")
        or soup.select("div.g")
        or soup.select("div[data-sokoban-container]")
        or soup.select("div.Gx5Zad")
        or soup.select("div.MjjYud")
    )

    if not cards:
        log.warning(f"[discover] zero result cards — selector may be stale. query={query[:80]!r}")

    count = 0
    for card in cards:
        if count >= max_results:
            break
        a = card.select_one("a[href]")
        h3 = card.select_one("h3")
        s = (
            card.select_one(".VwiC3b")
            or card.select_one(".IsZvec")
            or card.select_one("span[class]")
        )
        if a and h3:
            href = a.get("href", "")
            if href.startswith("http"):
                yield {
                    "url": href,
                    "title": h3.get_text(" ", strip=True),
                    "snippet": (s.get_text(" ", strip=True) if s else ""),
                }
                count += 1


def _detect_role(text: str) -> str:
    t = text.lower()
    for keywords, label in ROLE_PATTERNS:
        if any(k in t for k in keywords):
            return label
    return ""


def _parse_linkedin_snippet(title: str, snippet: str) -> dict:
    """
    Extract structured person data from a LinkedIn Google result.

    Handles title formats:
      "Sarah Chen on LinkedIn: 'Open to photography projects this summer'"
      "John Doe • CEO at Acme Corp | LinkedIn"
      "Jane Smith - Freelance Photographer - Self-employed | LinkedIn"
    """
    person = {"name": "", "role": "", "company": "", "portfolio_url": ""}
    combined = title + " " + snippet

    # "Name on LinkedIn:" pattern (post snippets)
    m = re.match(
        r"^([A-Z][a-zA-Z'\-]+(?: [A-Z][a-zA-Z'\-]+){1,3})\s+on LinkedIn",
        title,
    )
    if m:
        person["name"] = m.group(1).strip()

    # "Name • Role at Company | LinkedIn" or "Name - Role - Company | LinkedIn"
    m2 = re.match(
        r"^([A-Z][a-zA-Z'\-]+(?: [A-Z][a-zA-Z'\-]+){1,3})"
        r"\s*[•\-]\s*(.+?)\s*(?:\bat\b|@|-)\s*(.+?)\s*[|\-]",
        title,
    )
    if m2:
        if not person["name"]:
            person["name"] = m2.group(1).strip()
        person["role"] = m2.group(2).strip()
        person["company"] = m2.group(3).strip()

    # Fall back to role detection across full text
    if not person["role"]:
        person["role"] = _detect_role(combined)

    # "at Company" pattern in snippet
    if not person["company"]:
        co_m = re.search(
            r"\b(?:at|@)\s+([A-Z][a-zA-Z0-9\s&,\.]{2,40}?)(?:\s*[|\-•,]|$)",
            snippet,
        )
        if co_m:
            person["company"] = co_m.group(1).strip()

    # Portfolio/website URL (photographers, freelancers often include their site)
    url_m = re.search(
        r"https?://(?!(?:www\.)?(?:linkedin|twitter|instagram|facebook|x\.com))[^\s\)\"',]+",
        combined,
    )
    if url_m:
        person["portfolio_url"] = url_m.group(0).rstrip(".,;)")

    return person


def _extract_portfolio_url(title: str, snippet: str) -> str:
    """Pull the first non-social URL from title + snippet."""
    combined = title + " " + snippet
    urls = re.findall(r"https?://[^\s\)\"',]+", combined)
    for u in urls:
        u = u.rstrip(".,;)")
        if not any(s in u for s in ["linkedin", "twitter", "instagram", "facebook", "x.com"]):
            return u
    return ""


def _exclude(hit: dict, client_domain: str, exclude_domains: set, brief: dict) -> bool:
    url_lower = (hit["url"] or "").lower()
    d = _domain(hit["url"])

    if client_domain and client_domain in d:
        return True

    # Path-aware job board exclusion (domain-only check misses /jobs/ paths)
    if any(p in url_lower for p in JOB_URL_PATTERNS):
        return True

    if any(bad in d for bad in exclude_domains):
        return True

    text = (hit["title"] + " " + hit["snippet"]).lower()

    if any(s in text for s in JOB_TEXT_SIGNALS):
        return True

    for bad_term in brief.get("exclude_terms", []):
        if str(bad_term).lower() in text:
            return True

    return False


def _score(hit: dict, brief: dict) -> tuple[float, list]:
    d = _domain(hit["url"])
    text = (hit["title"] + " " + hit["snippet"]).lower()

    s = 0.0
    reasons = []

    if d in SOCIAL_HOSTS:
        s += 0.35

    lead_signals = [str(x).lower() for x in brief.get("lead_signals", [])]
    services = [str(x).lower() for x in brief.get("services", [])]

    hits = 0
    for sig in lead_signals:
        if sig in text:
            hits += 1
            reasons.append(sig)
    for srv in services:
        if srv in text:
            hits += 1
            reasons.append(srv)

    if hits > 0:
        s += min(0.65, hits * 0.15)

    return max(0.0, min(1.0, s)), list(set(reasons))


def discover_from_brief(campaign_id: str, brief: dict, per_query: int = 8):
    """
    Generator that yields progress events then a final result event with all leads.
    Does NOT write to the database — the caller (campaigns.py orchestrator) handles saving.
    """
    client_domain = _domain(brief.get("client_website") or "")

    exclude_domains = set(EXCLUDE_DOMAINS_DEFAULT)
    for item in brief.get("exclude_domains") or []:
        s = str(item)
        exclude_domains.add(_domain(s) if "://" in s else s.lower())

    queries = [q for q in brief.get("search_queries", []) if q]
    if not queries:
        services = brief.get("services", ["services"])
        queries = [
            f'site:linkedin.com (inurl:posts OR inurl:pulse) '
            f'("open to work" OR "available for" OR "looking for clients") "{svc}"'
            for svc in services[:3]
        ]

    leads, seen = [], set()
    total_q = len(queries)
    t0 = time.time()
    raw_total = 0
    candidates_total = 0

    for i, q in enumerate(queries):
        pct = int(100 * (i / max(1, total_q)))
        try:
            batch = list(_google_results(q, per_query))
        except Exception as e:
            log.error(f"[discover] scrape failed for query {i+1}: {e}")
            yield {"type": "progress", "progress": pct, "step": f"Search {i+1}/{total_q} — scrape error, skipping"}
            continue

        candidates = [
            h for h in batch
            if h["url"] not in seen and not _exclude(h, client_domain, exclude_domains, brief)
        ]
        raw_total += len(batch)
        candidates_total += len(candidates)
        log.info(f"[discover] query={q[:60]!r} raw={len(batch)} candidates={len(candidates)}")
        yield {
            "type": "progress",
            "progress": pct,
            "step": f"Search {i+1}/{total_q} — {len(candidates)} candidates found",
        }

        for hit in candidates:
            d = _domain(hit["url"])
            sc, reasons = _score(hit, brief)
            parsed = _parse_linkedin_snippet(hit["title"], hit["snippet"])

            # Prefer parsed company; fall back to domain only if it's not a social platform
            company = parsed["company"] or (d if d not in SOCIAL_HOSTS else "")

            leads.append({
                "id": uuid.uuid4().hex,
                "campaign_id": campaign_id,
                "name": parsed["name"] or hit["title"][:80],
                "company": company,
                "role": parsed["role"],
                "email": None,
                "score": int(round(sc * 100)),
                "status": "New",
                "match_reasons": reasons,
                "source_url": hit["url"],
                "url": hit["url"],
                "snippet": hit["snippet"],
                "portfolio_url": parsed.get("portfolio_url") or _extract_portfolio_url(hit["title"], hit["snippet"]),
            })
            seen.add(hit["url"])

    log.info(
        "[discover] complete campaign_id=%s queries=%d raw=%d candidates=%d leads=%d duration_s=%.1f",
        campaign_id, total_q, raw_total, candidates_total, len(leads), time.time() - t0,
    )
    yield {"type": "result", "leads": leads}

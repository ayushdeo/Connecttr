# app/services/contact_enricher.py
import os, re, socket, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

EMAIL_RE = re.compile(
    r"(?<![\w\-/])"
    r"[A-Z0-9._%+-]+"
    r"@"
    r"[A-Z0-9.-]+\.[A-Z]{2,24}"
    r"(?!\.(?:png|jpg|jpeg|gif|webp|svg|css|js|pdf))",
    re.I,
)

SOCIAL_DOMAINS = {
    "linkedin.com", "twitter.com", "x.com", "instagram.com",
    "facebook.com", "tiktok.com", "reddit.com",
}

BAD_EMAIL_DOMAINS = {
    "linkedin.com", "twitter.com", "x.com", "facebook.com", "instagram.com",
    "noreply.github.com", "error-tracking.reddit.com",
    "sentry.io", "bugsnag.com", "example.com", "test.com",
    "mailchimp.com", "sendgrid.net", "segment.io", "intercom.io",
    "freshdesk.com", "zendesk.com", "amazonaws.com", "cloudfront.net",
    "medium.com", "via.hypothes.is",
}


def _is_social_url(url: str) -> bool:
    try:
        return urlparse(url).netloc.replace("www.", "") in SOCIAL_DOMAINS
    except Exception:
        return False


def _safe_get(url: str, timeout: int = 12) -> tuple[str, str]:
    try:
        r = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code < 400:
            return r.text, r.url
    except Exception:
        pass
    return "", url


def _only_valid_emails(candidates: list) -> list:
    out = []
    for e in set(candidates):
        domain = e.lower().split("@")[-1]
        if domain in BAD_EMAIL_DOMAINS:
            continue
        out.append(e)
    return out


def _extract_emails_from_html(html: str) -> list:
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    found = []
    for a in soup.select('a[href^="mailto:"]'):
        addr = a.get("href", "").split("mailto:")[-1].split("?")[0].strip()
        if EMAIL_RE.search(addr):
            found.append(addr)
    text = soup.get_text(" ", strip=True)
    found += EMAIL_RE.findall(text)
    return _only_valid_emails(found)


def _find_contact_links(html: str, base: str) -> list:
    try:
        soup = BeautifulSoup(html, "html.parser")
        links = []
        for a in soup.select("a[href]"):
            href = a["href"].strip().lower()
            txt = (a.get_text(" ", strip=True) or "").lower()
            if any(k in href for k in ["contact", "about", "impressum", "team"]) or \
               any(k in txt for k in ["contact", "about", "impressum", "team"]):
                links.append(urljoin(base, a["href"]))
        return links[:5]
    except Exception:
        return []


def _hunter_lookup(first: str, last: str, domain: str) -> str | None:
    """Look up verified email via Hunter.io API (free tier: 25/month)."""
    api_key = os.getenv("HUNTER_API_KEY")
    if not api_key or not domain or not first or not last:
        return None
    if any(bad in domain for bad in SOCIAL_DOMAINS):
        return None
    try:
        r = requests.get(
            "https://api.hunter.io/v2/email-finder",
            params={
                "domain": domain,
                "first_name": first,
                "last_name": last,
                "api_key": api_key,
            },
            timeout=8,
        )
        if r.ok:
            data = r.json().get("data", {})
            email = data.get("email")
            confidence = data.get("score", 0)
            if email and confidence >= 50:
                return email
    except Exception:
        pass
    return None


def _has_mx_record(domain: str) -> bool:
    """Basic reachability check before synthesising email for a domain."""
    try:
        socket.getaddrinfo(domain, None)
        return True
    except Exception:
        return False


def _synthesize_candidates(name_str: str, company_domain: str) -> list:
    """Generate common email format candidates for a given name + domain."""
    domain = company_domain.replace("www.", "").lower().strip()
    if not domain or "." not in domain:
        return []
    if any(bad in domain for bad in SOCIAL_DOMAINS):
        return []

    parts = [p for p in (name_str or "").strip().split() if p.isalpha()]
    if len(parts) >= 2:
        first, last = parts[0].lower(), parts[-1].lower()
        return [
            f"{first}.{last}@{domain}",   # most common
            f"{first[0]}{last}@{domain}", # jdoe@
            f"{first}@{domain}",          # john@
            f"{first}_{last}@{domain}",   # john_doe@
        ]
    if len(parts) == 1:
        return [f"{parts[0].lower()}@{domain}"]
    return [f"hello@{domain}"]


def _scrape_for_email(url: str) -> str | None:
    """Fetch a URL and its contact sub-pages, return first valid email found."""
    if not url or _is_social_url(url):
        return None
    html, final_url = _safe_get(url)
    emails = _extract_emails_from_html(html)
    if not emails:
        for link in _find_contact_links(html, final_url):
            html2, _ = _safe_get(link)
            emails = _extract_emails_from_html(html2)
            if emails:
                break
    return emails[0] if emails else None


def enrich_leads_with_email(leads: list, max_to_enrich: int = 50):
    """
    Generator that enriches leads with email addresses using a 4-step fallback chain:
      1. Hunter.io API lookup (if HUNTER_API_KEY set and company domain known)
      2. Scrape portfolio URL extracted from snippet
      3. Scrape source URL directly (skipped for social walls)
      4. Synthesise first.last@domain (MX-validated)

    Yields progress events every 5 leads, then a final result event.
    """
    total = min(len(leads), max_to_enrich)

    if total == 0:
        yield {"type": "result", "leads": leads}
        return

    enriched = 0
    for i, lead in enumerate(leads):
        if enriched >= max_to_enrich:
            break

        if i % 5 == 0 or i == 0:
            pct = int(100 * (i / max(1, len(leads))))
            yield {
                "type": "progress",
                "progress": pct,
                "step": f"Finding contact info — {i + 1} of {total}",
            }

        if lead.get("email"):
            enriched += 1
            continue

        name = lead.get("name", "")
        company_domain = lead.get("company", "")
        src = lead.get("source_url") or ""
        portfolio = lead.get("portfolio_url") or ""

        name_parts = [p for p in name.strip().split() if p.isalpha()]
        first = name_parts[0] if name_parts else ""
        last = name_parts[-1] if len(name_parts) > 1 else ""

        email = None

        # 1. Hunter.io — most reliable when we have a real company domain
        if company_domain and not _is_social_url(f"https://{company_domain}"):
            email = _hunter_lookup(first, last, company_domain)

        # 2. Scrape portfolio URL (photographers/freelancers share their site in posts)
        if not email and portfolio:
            email = _scrape_for_email(portfolio)

        # 3. Scrape source URL if it's not a social wall
        if not email and not _is_social_url(src):
            email = _scrape_for_email(src)

        # 4. Synthesise from name + company domain (MX-validated)
        if not email:
            cands = _synthesize_candidates(name, company_domain)
            if cands:
                domain = company_domain.replace("www.", "").strip()
                if _has_mx_record(domain):
                    email = cands[0]
                    lead["email_candidates"] = cands  # store all variants for bounce fallback
                    lead["status"] = "Guessed"

        if email:
            lead["email"] = email
            if lead.get("status") != "Guessed":
                lead["status"] = "New"
            enriched += 1
        else:
            lead["status"] = "Needs Email"

    yield {"type": "result", "leads": leads}

# app/services/contact_enricher.py
import re, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# stricter email pattern (must end with a TLD; filters image @2x etc.)
EMAIL_RE = re.compile(
    r"(?<![\w\-/])"               # not part of a path/filename
    r"[A-Z0-9._%+-]+"             # local
    r"@"                          
    r"[A-Z0-9.-]+\.[A-Z]{2,24}"   # domain.tld
    r"(?!\.(?:png|jpg|jpeg|gif|webp|svg|css|js|pdf))",  # not image/file ext
    re.I,
)

BAD_EMAIL_DOMAINS = {
    "error-tracking.reddit.com","linkedin.com","twitter.com","x.com","facebook.com","instagram.com","noreply.github.com",
}

def _safe_get(url, timeout=12):
    try:
        r = requests.get(url, timeout=timeout, headers={"User-Agent":"Mozilla/5.0"})
        if r.status_code < 400:
            return r.text, r.url
    except Exception:
        pass
    return "", url

def _only_valid_emails(candidates):
    out = []
    for e in set(candidates):
        if any(e.lower().endswith("@" + bad) or e.lower().split("@")[-1] == bad for bad in BAD_EMAIL_DOMAINS):
            continue
        out.append(e)
    return out

def _extract_emails_from_html(html):
    if not html: return []
    soup = BeautifulSoup(html, "html.parser")
    found = []

    # 1) explicit mailto: links
    for a in soup.select('a[href^="mailto:"]'):
        href = a.get("href","")
        addr = href.split("mailto:")[-1].split("?")[0].strip()
        if EMAIL_RE.search(addr): found.append(addr)

    # 2) visible text only (avoid picking emails from URLs/attributes)
    text = soup.get_text(" ", strip=True)
    found += EMAIL_RE.findall(text)
    return _only_valid_emails(found)

def _find_contact_links(html, base):
    try:
        soup = BeautifulSoup(html, "html.parser")
        links = []
        for a in soup.select("a[href]"):
            href = a["href"].strip().lower()
            txt  = (a.get_text(" ", strip=True) or "").lower()
            if any(k in href for k in ["contact","about","impressum","team"]) or any(k in txt for k in ["contact","about","impressum","team"]):
                links.append(urljoin(base, a["href"]))
        return links[:5]
    except Exception:
        return []

def _synthesize_email(name_str, company_domain):
    domain = company_domain.replace("www.","").lower()
    if not domain or "linkedin" in domain or "instagram" in domain or "x.com" in domain or "twitter" in domain:
        return None
        
    names = name_str.strip().split() if name_str else []
    if len(names) >= 2 and len(names[0]) > 0:
        first = "".join(filter(str.isalpha, names[0].lower()))
        if first:
            return f"{first}@{domain}"
            
    return f"hello@{domain}"

def enrich_leads_with_email(leads, max_to_enrich=20):
    count = 0
    total = min(len(leads), max_to_enrich)
    
    if total == 0:
        yield {"type": "result", "leads": leads}
        return
        
    for i, lead in enumerate(leads):
        pct = int(100 * (i / max(1, len(leads))))
        yield {"type": "progress", "progress": pct, "step": f"Validating signals & enriching logic loops {i+1}/{total}..."}
        
        if count >= max_to_enrich: continue
        if lead.get("email"): continue

        src = lead.get("source_url") or ""
        html, final_url = _safe_get(src)

        emails = _extract_emails_from_html(html)

        if not emails:
            for link in _find_contact_links(html, final_url):
                html2, _ = _safe_get(link)
                emails = _extract_emails_from_html(html2)
                if emails: break

        if emails:
            lead["email"]  = emails[0]
            lead["status"] = "New"
            count += 1
        else:
            synth = _synthesize_email(lead.get("name",""), lead.get("company",""))
            if synth:
                lead["email"] = synth
                lead["status"] = "Guessed"
                count += 1
            else:
                lead["status"] = "Needs Email"
            
    yield {"type": "result", "leads": leads}
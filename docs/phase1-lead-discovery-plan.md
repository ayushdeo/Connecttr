# Phase 1 — Lead Discovery: Full Diagnosis & Implementation Plan

> **Status:** Pending approval  
> **Authored by:** Senior Engineer / UX / Systems Architect review  
> **Scope:** `company_analyzer.py`, `web_extractor.py`, `lead_discovery.py`, `contact_enricher.py`, `scraper_service.py`, `campaigns.py` (orchestrator), `CampaignManager.jsx`, `StartNewCampaign.jsx`

---

## Executive Summary

Phase 1 is broken in three compounding ways:

1. **Website analysis produces empty or hallucinated briefs** due to a token cap that truncates the LLM response, a wrong model choice for the task, and a silent env-var mismatch.
2. **Lead discovery finds zero usable leads** because 100% of results come from LinkedIn URLs that return login walls, the Google CSS selector is stale with no fallback, and key search parameters (`&num=`) are missing.
3. **Contact enrichment enriches nothing** because every lead's `source_url` is a LinkedIn wall, the synthesized email uses only the first name against a domain that is always `linkedin.com`, and there is no fallback to any real email-finding API.

The result: users click "Find Leads", see a realistic progress bar, and get a table of leads with no emails, garbage names like *"John Doe on LinkedIn: 'Looking for a photog…'"*, and company field showing `linkedin.com` for every row.

---

## Layer-by-Layer Problem Catalogue

### Layer 1 — Website Analysis (`company_analyzer.py` + `web_extractor.py`)

#### P0 — `max_tokens: 600` truncates the JSON response
The output schema has 8 array fields. A realistic brief (5 search queries, 6 lead signals, 4 outreach angles) needs ~900–1,200 tokens. At the 600-token cap the LLM is cut off mid-JSON, `_extract_json_block` fails silently, and `_normalize_brief({})` returns an all-empty brief with `quality=0.0`. Every downstream call then works against no data.

**Evidence:** `company_analyzer.py:112` — `"max_tokens": 600`

#### P0 — Env-var name mismatch silently breaks the scrape.do fallback
`web_extractor.py:123` reads `os.getenv("SCRAPE_DO_TOKEN")`. `lead_discovery.py:23` reads `os.getenv("SCRAPEDO_TOKEN")`. These are two different names. Only one can be set. Whichever is not set causes a silent no-op: the fallback is skipped, `text` stays empty, and the analyzer receives blank content — triggering the `quality < 0.55` fallback path on every single campaign.

**Evidence:** `web_extractor.py:123` vs `lead_discovery.py:23`

#### P1 — Perplexity Sonar is the wrong model for structured extraction
Sonar is a retrieval-augmented search model. Passed a 20,000-character markdown blob at `temperature=0.0`, it can supplement the provided text with its own web knowledge, injecting facts about the company that conflict with the actual site content. A standard chat-completion model (Claude Haiku, GPT-4o mini) would be more deterministic and ~3× cheaper for this extraction task.

#### P1 — No validation that the LLM brief is actionable
After `_normalize_brief`, there is no check that `search_queries` is non-empty or that `icp_summary` has meaningful content. An empty brief propagates silently into discovery, which then runs a degenerate query like `site:linkedin.com (inurl:posts OR inurl:update) ""`.

#### P1 — Website content sent to LLM is unfiltered noise
Jina.ai returns full page markdown including navigation menus, cookie banners, footers, and promotional scripts. These consume tokens and dilute the signal. The analyzer gets 20,000 characters of mixed noise rather than the ~3,000 that matter.

#### P2 — No validation that Jina returned meaningful content
A Jina response of `"Sign in to LinkedIn to view"` is 40 characters — below the 300-char threshold — so it correctly falls back. But `"Please enable JavaScript to continue"` is also below 300 chars and correctly falls back. However, a Jina response that is a JS-heavy marketing page of 1,500 chars could pass and still be meaningless.

#### P2 — 20,000 char input combined with 600-token output is incoherent
Even at a corrected 1,500-token cap, the ratio of input to output is 20,000 chars in vs ~1,100 tokens out. This forces extreme compression. Truncating input to ~8,000 chars of the most relevant page sections (hero, about, services, pricing) before sending would improve quality and reduce cost.

---

### Layer 2 — Lead Discovery (`lead_discovery.py`)

#### P0 — Google CSS selector `div.tF2Cxc` is stale with no fallback
Google changes its HTML DOM periodically. `div.tF2Cxc` was the result container class as of early 2024. When it changes (or already has changed), `_google_results()` silently yields zero results. There is no detection of "zero results returned", no fallback selector, and no log warning. The campaign reports "0 leads found" with no explanation.

**Evidence:** `lead_discovery.py:33` — `soup.select("div.tF2Cxc")[:max_results]`

Note: `scraper_service.py:53` already has a fallback: `soup.select("div.tF2Cxc") or soup.select("div.g")`. The same resilience was never ported to `lead_discovery.py`.

#### P0 — `&num=` parameter is missing from the Google search URL
`_google_results()` builds the URL as `"https://www.google.com/search?q=" + query` with no `&num=20` parameter. Google defaults to 10 results per page. Even though the orchestrator calls `discover_from_brief(campaign_id, brief, per_query=15)`, `_google_results(q, 15)` only limits how many of the returned results to keep — it never requests more than 10 from Google. Maximum possible leads per query: 10.

**Compare:** `scraper_service.py:41` correctly builds `&num=20&hl=en`.

#### P0 — All discovered leads point to LinkedIn URLs, which are login walls
The AI-generated `search_queries` target `site:linkedin.com`, so every result URL is a LinkedIn post or profile. When `contact_enricher.py` calls `_safe_get(src)` on these URLs, LinkedIn redirects to `/login`. The enricher gets a login-page HTML with zero emails. This failure is guaranteed and affects 100% of leads.

#### P1 — `name` field is the raw Google result title, not a person's name
`"name": hit["title"][:120]` stores the full title string. LinkedIn titles look like:
> `"Sarah Chen on LinkedIn: 'We're looking for a great wedding photographer…'"`

The Email Hub then displays this as the lead's name. `_synthesize_email` tries to split this on spaces and uses `names[0]` ("Sarah") as the first name — which accidentally works in this case, but with titles like `"Jane Doe • CEO at Acme | LinkedIn"` the parse fails.

#### P1 — `company` field is always `linkedin.com`
`"company": d.replace("www.","")` where `d = _domain(hit["url"])`. For LinkedIn results, `d` is always `linkedin.com`. Every single lead shows `linkedin.com` as their company in the Email Hub table.

#### P1 — Job listings are not excluded despite `EXCLUDE_DOMAINS_DEFAULT`
`EXCLUDE_DOMAINS_DEFAULT` includes `"linkedin.com/jobs"` but `_domain()` strips the path and returns only the hostname. So `_exclude()` checks `"linkedin.com/jobs" in "linkedin.com"` → `False`. LinkedIn job listings pass through the filter. The only exclusion for jobs comes from `exclude_terms` in the brief, but those are not reliably generated.

#### P1 — Role detection is too narrow and misses common titles
The role extractor checks: `"founder"`, `"ceo"`, `"vp"`, `"vice president"`, `"director"`, `"manager"`, `"coordinator"`. Missing: `"head of"`, `"chief"`, `"president"`, `"partner"`, `"principal"`, `"owner"`, `"managing director"`, `"c-suite"`, `"cto"`, `"cmo"`, `"coo"`. Most C-suite leads are missed.

#### P1 — Synchronous `requests.get()` inside async FastAPI generator blocks the event loop
`discover_from_brief()` and `enrich_leads_with_email()` use `requests` (synchronous) inside an `async def orchestrator()` generator in `campaigns.py`. Every scrape.do call blocks the event loop for 10–40 seconds, freezing all other concurrent HTTP requests to the server. Under any real production load this is a reliability failure.

#### P2 — No `&hl=en` locale param in `lead_discovery.py`
Google search results vary by server locale. Without `hl=en`, Render's server (likely US or EU) may return results in mixed languages depending on the IP geolocation.

#### P2 — `per_query` value in the brief is never exposed to the user
Campaigns run with `per_query=15` hardcoded in the orchestrator. There is no way for a user or admin to adjust how many results to fetch per query.

---

### Layer 3 — Contact Enrichment (`contact_enricher.py`)

#### P0 — LinkedIn source URLs always produce login-page HTML
`_safe_get(src)` on a LinkedIn URL returns a redirect to `linkedin.com/login`. The resulting HTML contains zero email addresses. `_extract_emails_from_html` returns `[]`. The contact page search finds no contact links either. We fall to synthesis.

#### P0 — Email synthesis fails for all LinkedIn leads
`_synthesize_email(name, company)` receives `company = "linkedin.com"` (since that's what was stored). The guard `if "linkedin" in domain: return None` correctly rejects this. Result: status = `"Needs Email"` for every lead.

Even if the company domain were correct, the synthesizer generates `first@company.com` — a single-name format that bounces for the majority of real corporate email servers. The most common patterns are `firstname.lastname@`, `f.lastname@`, and `flastname@`.

#### P1 — No real email-finding API integration
The entire enrichment strategy is: parse HTML → guess from name. There is no call to Hunter.io, Apollo.io, Clearbit, Snov.io, or any prospecting database. For B2B lead gen, these APIs are standard infrastructure. Without them, the email discovery rate for valid company websites is ~15–30%. For social media source URLs, it is 0%.

#### P1 — Synthesized emails have no MX record validation
Even when synthesis produces a plausible address, there is no DNS MX lookup to verify the domain accepts mail. Sending to non-existent domains destroys sender reputation.

#### P1 — `max_to_enrich` limit is implemented incorrectly
```python
for i, lead in enumerate(leads):
    if count >= max_to_enrich: continue  # ← should be break
```
This iterates over all `len(leads)` items, emitting a progress event for each, even after the cap is reached. With 80 leads and `max_to_enrich=50`, you get 80 progress events and 80 HTTP requests all waiting (even though 30 of them do nothing).

#### P2 — `BAD_EMAIL_DOMAINS` is too small
The set only blocks 7 domains. Missing: `sentry.io`, `bugsnag.com`, `example.com`, `test.com`, `mailchimp.com`, `sendgrid.net`, `segment.com`, `intercom.io`, `freshdesk.com`, `zendesk.com`, and platform emails like `via.hypothes.is`.

#### P2 — No parallel HTTP requests
Enrichment is fully sequential — one HTTP request at a time with a `timeout=12`. With 50 leads, this takes a minimum of 50 × ~3s = 2.5 minutes in the best case, and up to 50 × 12s = 10 minutes if many timeout.

---

### Layer 4 — Architecture & Dead Code

#### P1 — `scraper_service.py` is inconsistent dead code called by the pipeline API
`scraper_service.py` has a hardcoded photographer query, no `org_id`, no `campaign_id`, and writes directly to the leads collection. It's the original prototype, never cleaned up. The `/pipeline/scrape` endpoint still calls it. Its token reads `SCRAPE_DO_TOKEN` (with a hardcoded fallback that is a real credential). This is both a security risk and a source of confusion.

#### P1 — No structured observability for the pipeline
There is no logging of: how many Google results were returned per query, which web extraction method was used, what percentage of leads got real vs. synthesized vs. no email, or how long each stage took. Debugging failures requires guessing.

#### P2 — No caching
Every "Find Leads" click for the same campaign re-runs all scrape.do calls and Perplexity LLM calls. Identical queries are re-executed with no deduplication. This wastes API credits and increases latency.

---

### Layer 5 — UX Problems

#### P1 — No way to edit search queries before running discovery
The "Review Campaign Brief" screen shows "AI Discovery Paths" as a read-only list. If the queries are poor quality, the only recovery is "Describe it manually instead" — which discards the entire AI brief. Users cannot fix individual queries.

#### P1 — Progress messages expose implementation internals
`"Scraping logic loop 2/5..."` and `"Validating signals & enriching logic loops 12/20..."` are developer-speak. A user sees "logic loops" and doesn't know if this is progress or an error.

#### P1 — No per-query result count shown
After discovery, users see a total lead count but have no visibility into which queries succeeded, which returned zero results, or why.

#### P2 — "Needs Email" leads pollute the Email Hub without distinction
Leads with `status="Needs Email"` are saved and shown in the Email Hub alongside actionable leads. There is no filtering or visual separation. Users attempt to draft emails to leads they cannot contact.

#### P2 — Quality score is not explained to users
The campaign brief shows a Quality metric but there's no tooltip or explanation of what it means or what to do when it's low.

---

## Implementation Plan

The fixes are grouped into three tracks that can be worked in parallel. Track A fixes the analysis pipeline. Track B fixes lead sourcing. Track C fixes enrichment. All three must be complete for Phase 1 to work end-to-end.

---

### Track A — Fix Website Analysis

#### A1 (P0) — Fix the env-var name mismatch
**Files:** `web_extractor.py:123`, `lead_discovery.py:23`, `.env`

Standardize to one name: `SCRAPEDO_TOKEN`. Update `web_extractor.py` to read `os.getenv("SCRAPEDO_TOKEN")` and remove the dead-code default token string from `scraper_service.py`.

```python
# web_extractor.py — change line 123
TOKEN = os.getenv("SCRAPEDO_TOKEN")  # was SCRAPE_DO_TOKEN
```

Also add the `SCRAPEDO_TOKEN` entry to the `.env` file and update the Render env-var dashboard.

---

#### A2 (P0) — Raise `max_tokens` to 1,500
**File:** `company_analyzer.py:112`

```python
"max_tokens": 1500,  # was 600 — 8 array fields need ~900-1200 tokens minimum
```

---

#### A3 (P1) — Add post-analysis validation with hard failure
**File:** `company_analyzer.py` — add after `_normalize_brief` call

```python
def _validate_brief(d: Dict[str, Any]) -> bool:
    """Returns True only if the brief has enough signal to run discovery."""
    return (
        len(d.get("search_queries", [])) >= 2
        and len(d.get("icp_summary", "")) > 30
        and d.get("quality", 0.0) >= 0.40
    )
```

In the `analyze` endpoint (`campaigns.py`), if `_validate_brief` fails, set `fallback_needed=True` and surface a specific reason string to the frontend ("Brief quality too low — please describe your company manually").

---

#### A4 (P1) — Pre-process website content before sending to LLM
**File:** `web_extractor.py` — add a `_focus_content(text)` step before returning

Strip obvious noise before sending to the analyzer:
- Remove markdown navigation link blocks (lines that are just `[text](url)` repeated)
- Remove lines that are purely `---` separators
- Truncate to 8,000 characters (not 20,000) — the analyzer doesn't need body copy, it needs headers, CTAs, and service descriptions

```python
def _focus_content(text: str, max_chars: int = 8000) -> str:
    lines = text.split("\n")
    # Drop nav-only lines: pure markdown links with no body text
    lines = [l for l in lines if not re.match(r"^\[.+\]\(.+\)\s*$", l.strip())]
    focused = "\n".join(lines)
    focused = re.sub(r"\n{3,}", "\n\n", focused).strip()
    return focused[:max_chars]
```

---

#### A5 (P2) — Add `&hl=en` and locale normalization to brief extraction
**File:** `company_analyzer.py` — prompt addition

Add to the user prompt: "All output fields must be in English regardless of the input language."

---

### Track B — Fix Lead Discovery

#### B1 (P0) — Fix Google result parsing with multi-selector fallback + zero-result detection
**File:** `lead_discovery.py:33`

```python
def _google_results(query: str, max_results: int = 15):
    token = os.getenv("SCRAPEDO_TOKEN")
    if not token:
        raise RuntimeError("SCRAPEDO_TOKEN missing")

    google_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}&num=20&hl=en"
    encoded = urllib.parse.quote(google_url, safe="")
    url = f"http://api.scrape.do/?token={token}&url={encoded}&render=true"

    r = requests.get(url, timeout=40)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")
    # Multi-selector fallback — Google changes class names periodically
    cards = (
        soup.select("div.tF2Cxc") or
        soup.select("div.g") or
        soup.select("div[data-sokoban-container]") or
        soup.select("div.Gx5Zad")
    )

    if not cards:
        log.warning(f"[discover] zero Google result cards for query: {query[:80]}")

    for card in cards[:max_results]:
        a = card.select_one("a[href]")
        h3 = card.select_one("h3")
        s = card.select_one(".VwiC3b") or card.select_one(".IsZvec") or card.select_one("span")
        if a and h3:
            yield {
                "url": a.get("href"),
                "title": h3.get_text(" ", strip=True),
                "snippet": (s.get_text(" ", strip=True) if s else ""),
            }
```

Key changes: added `&num=20&hl=en`, fixed URL encoding to use `quote_plus` on the query (matching `scraper_service.py`), added multi-selector fallback chain, added zero-result warning log.

---

#### B2 (P0) — Fix the LinkedIn URL problem: extract real person data from snippets
**File:** `lead_discovery.py`

LinkedIn post Google snippets contain the person's name, role, company, and post text — all in the snippet itself, without needing to fetch the URL. We must parse this data from the snippet rather than from the page fetch.

Add a `_parse_linkedin_snippet` function:

```python
import re

def _parse_linkedin_snippet(title: str, snippet: str) -> dict:
    """
    Extract person name, role, and company from a LinkedIn Google result.
    
    Google title format examples:
      "Sarah Chen on LinkedIn: 'Looking for a wedding photographer...'"
      "John Doe • CEO at Acme Corp | LinkedIn"
      "Jane Smith - Founder & CEO - PhotoStudio | LinkedIn"
    """
    person = {"name": "", "role": "", "company": ""}

    # Pattern: "Name on LinkedIn:" (post snippets)
    m = re.match(r"^([A-Z][a-zA-Z'\-]+(?: [A-Z][a-zA-Z'\-]+){1,3})\s+on LinkedIn", title)
    if m:
        person["name"] = m.group(1).strip()

    # Pattern: "Name • Role at Company | LinkedIn" or "Name - Role - Company | LinkedIn"
    m2 = re.match(
        r"^([A-Z][a-zA-Z'\-]+(?: [A-Z][a-zA-Z'\-]+){1,3})\s*[•\-]\s*(.+?)\s*(?:at|@|-)\s*(.+?)\s*[|\-]",
        title
    )
    if m2:
        person["name"] = m2.group(1).strip()
        person["role"] = m2.group(2).strip()
        person["company"] = m2.group(3).strip()

    # Extract role from snippet if not found in title
    if not person["role"]:
        role_m = re.search(
            r"\b(Founder|Co-Founder|CEO|CTO|CMO|COO|VP|President|Director|Head of|Manager|Owner|Partner|Principal)\b",
            title + " " + snippet, re.I
        )
        if role_m:
            person["role"] = role_m.group(1)

    # Extract company from snippet patterns like "at Acme" or "@ Acme"
    if not person["company"]:
        co_m = re.search(r"\b(?:at|@)\s+([A-Z][a-zA-Z0-9\s&,\.]{2,40}?)(?:\s*[|\-•,]|$)", snippet)
        if co_m:
            person["company"] = co_m.group(1).strip()

    return person
```

Update the main lead-building block in `discover_from_brief` to use this parser:

```python
parsed = _parse_linkedin_snippet(hit["title"], hit["snippet"])
leads.append({
    "id": uuid.uuid4().hex,
    "campaign_id": campaign_id,
    "name": parsed["name"] or hit["title"][:60],
    "company": parsed["company"] or d.replace("www.", ""),
    "role": parsed["role"] or role,
    "email": None,
    "score": int(round(sc * 100)),
    "status": "New",
    "match_reasons": reasons,
    "source_url": hit["url"],
    "url": hit["url"],
    "snippet": hit["snippet"],
})
```

---

#### B3 (P1) — Fix job listing exclusion (path-aware URL filter)
**File:** `lead_discovery.py` — update `_exclude()`

The current `_domain()` strips paths. Job listings must be excluded by checking the full URL, not just the domain:

```python
def _exclude(hit, client_domain, exclude_domains, brief):
    url_lower = (hit["url"] or "").lower()
    d = _domain(hit["url"])

    if client_domain and client_domain in d:
        return True

    # Path-aware exclusion for job boards embedded in social platforms
    JOB_URL_PATTERNS = ["/jobs/", "/jobs/view/", "linkedin.com/jobs", "indeed.com", "glassdoor.com"]
    if any(p in url_lower for p in JOB_URL_PATTERNS):
        return True

    if any(bad in d for bad in exclude_domains):
        return True

    text = (hit["title"] + " " + hit["snippet"]).lower()
    JOB_TITLE_SIGNALS = ["is hiring", "we're hiring", "job opening", "apply now", "job description", "full-time", "part-time"]
    if any(s in text for s in JOB_TITLE_SIGNALS):
        return True

    for bad_term in brief.get("exclude_terms", []):
        if str(bad_term).lower() in text:
            return True

    return False
```

---

#### B4 (P1) — Expand role detection vocabulary
**File:** `lead_discovery.py` — update role-detection block

```python
ROLE_PATTERNS = [
    (["founder", "co-founder", "cofounder"], "Founder"),
    (["ceo", "chief executive"], "CEO"),
    (["cto", "chief technology"], "CTO"),
    (["cmo", "chief marketing"], "CMO"),
    (["coo", "chief operating"], "COO"),
    (["vp", "vice president", "vice-president"], "VP"),
    (["president"], "President"),
    (["owner"], "Owner"),
    (["partner"], "Partner"),
    (["principal"], "Principal"),
    (["head of", "head,"], "Head Of"),
    (["director"], "Director"),
    (["manager"], "Manager"),
    (["coordinator"], "Coordinator"),
]

def _detect_role(text: str) -> str:
    t = text.lower()
    for keywords, label in ROLE_PATTERNS:
        if any(k in t for k in keywords):
            return label
    return ""
```

---

#### B5 (P2) — Add per-query result logging to surface zero-yield queries
**File:** `lead_discovery.py` — inside the `for i, q in enumerate(queries)` loop

```python
batch = list(_google_results(q, per_query))
batch_leads = [hit for hit in batch if not _exclude(hit, client_domain, exclude_domains, brief)]
log.info(f"[discover] query={q[:60]} raw={len(batch)} after_filter={len(batch_leads)}")
yield {"type": "progress", "progress": pct, "step": f"Query {i+1}/{total_q}: found {len(batch_leads)} candidates"}
```

This also surfaces real counts to the progress stream, which the frontend can display.

---

### Track C — Fix Contact Enrichment

#### C1 (P0) — Detect LinkedIn source URLs and skip the fetch entirely
**File:** `contact_enricher.py` — top of `enrich_leads_with_email`

LinkedIn URLs will never yield an email. Skip the fetch and jump straight to synthesis, but synthesize against the `company` field (which B2 will now populate correctly):

```python
SOCIAL_WALLS = {"linkedin.com", "twitter.com", "x.com", "instagram.com", "facebook.com"}

def _is_social_url(url: str) -> bool:
    try:
        return urlparse(url).netloc.replace("www.", "") in SOCIAL_WALLS
    except Exception:
        return False
```

In the loop:
```python
if _is_social_url(src):
    # Skip page fetch — social platforms never expose emails
    synth = _synthesize_email(lead.get("name", ""), lead.get("company", ""))
    lead["email"] = synth
    lead["status"] = "Guessed" if synth else "Needs Email"
    if synth: count += 1
    continue
```

---

#### C2 (P0) — Fix email synthesis to generate multiple format candidates
**File:** `contact_enricher.py` — rewrite `_synthesize_email`

The single-name `first@domain` format has a very low hit rate. Generate all common patterns and return the most probable one (or store all as candidates for later validation):

```python
def _synthesize_email_candidates(name_str: str, company_domain: str) -> list[str]:
    domain = company_domain.replace("www.", "").lower().strip()
    if not domain or any(bad in domain for bad in ["linkedin", "twitter", "instagram", "x.com", "facebook"]):
        return []
    if "." not in domain:
        return []

    parts = [p for p in (name_str or "").strip().split() if p.isalpha()]
    if len(parts) < 2:
        if len(parts) == 1:
            return [f"{parts[0].lower()}@{domain}"]
        return [f"hello@{domain}"]

    first, last = parts[0].lower(), parts[-1].lower()
    return [
        f"{first}.{last}@{domain}",      # most common: john.doe@
        f"{first[0]}{last}@{domain}",    # second: jdoe@
        f"{first}@{domain}",             # third: john@
        f"{first}_{last}@{domain}",      # fourth: john_doe@
    ]


def _synthesize_email(name_str: str, company_domain: str) -> str | None:
    candidates = _synthesize_email_candidates(name_str, company_domain)
    return candidates[0] if candidates else None
```

Store the full `candidates` list on the lead document so the email-sending layer can try alternatives on bounce.

---

#### C3 (P1) — Add Hunter.io integration as primary enrichment path
**File:** `contact_enricher.py` — new function, called before HTML scraping

Hunter.io (and alternatives: Apollo.io, Snov.io, Clearbit) provide reliable email lookup by first name + last name + domain. Hunter has a free tier of 25 searches/month and a cheap paid tier. This is the industry standard for B2B enrichment.

```python
def _hunter_lookup(first: str, last: str, domain: str) -> str | None:
    api_key = os.getenv("HUNTER_API_KEY")
    if not api_key or not domain:
        return None
    try:
        r = requests.get(
            "https://api.hunter.io/v2/email-finder",
            params={"domain": domain, "first_name": first, "last_name": last, "api_key": api_key},
            timeout=8
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
```

Updated enrichment priority order:
1. Hunter.io lookup (if `HUNTER_API_KEY` set + company domain is known)
2. HTML scrape of source URL (if not a social wall)
3. Contact page scrape
4. Synthesized candidates (stored as `email_candidates`, first used as `email`)
5. `status = "Needs Email"` as last resort

---

#### C4 (P1) — Fix the `max_to_enrich` loop inefficiency
**File:** `contact_enricher.py:91`

Change `continue` to `break`:
```python
# Before:
if count >= max_to_enrich: continue

# After:
if count >= max_to_enrich: break
```

Also: only emit progress events every 5 leads, not every 1, to reduce SSE noise.

---

#### C5 (P2) — Add MX record check for synthesized domains
**File:** `contact_enricher.py` — add DNS validation

```python
import socket

def _has_mx_record(domain: str) -> bool:
    try:
        socket.getaddrinfo(domain, None)  # Basic reachability
        # For proper MX: use dnspython if available
        # import dns.resolver
        # dns.resolver.resolve(domain, 'MX')
        return True
    except Exception:
        return False
```

Only synthesize emails for domains that have an MX record. This prevents queuing emails to dead domains that will hard-bounce.

---

#### C6 (P2) — Expand `BAD_EMAIL_DOMAINS`
**File:** `contact_enricher.py`

```python
BAD_EMAIL_DOMAINS = {
    "error-tracking.reddit.com", "linkedin.com", "twitter.com", "x.com",
    "facebook.com", "instagram.com", "noreply.github.com",
    "sentry.io", "bugsnag.com", "example.com", "test.com",
    "mailchimp.com", "sendgrid.net", "segment.io", "intercom.io",
    "freshdesk.com", "zendesk.com", "via.hypothes.is", "amazonaws.com",
    "cloudfront.net", "medium.com",
}
```

---

### Track D — Fix the Orchestration & Performance

#### D1 (P1) — Move synchronous HTTP calls off the async event loop
**File:** `campaigns.py` — `orchestrator()` function

Wrap all blocking service calls with `asyncio.get_event_loop().run_in_executor(None, ...)` or switch the service functions to use `httpx.AsyncClient` instead of `requests`. The immediate fix (lower risk):

```python
import asyncio

async def orchestrator():
    loop = asyncio.get_event_loop()

    # Run synchronous generators in a thread pool
    leads = await loop.run_in_executor(
        None,
        lambda: list(discover_from_brief(campaign_id, brief, per_query=15))
    )
    # ... etc
```

The proper fix (longer term) is to convert `web_extractor.py`, `lead_discovery.py`, and `contact_enricher.py` to use `httpx.AsyncClient` throughout.

---

#### D2 (P1) — Remove / quarantine `scraper_service.py` dead code
**File:** `scraper_service.py`, `pipeline.py`

`scraper_service.py` is the original prototype. It writes to a global leads collection without `org_id`, has a hardcoded photographer query, and exposes a real API token as a default parameter. Options:
- **Option A (safe):** Deprecate the `/pipeline/scrape` endpoint and add a comment marking the file as legacy. Remove the hardcoded token default.
- **Option B (clean):** Delete `scraper_service.py` and remove the `/pipeline/scrape` endpoint entirely.

Recommendation: Option B. The pipeline API has no callers in the frontend and the functionality is superseded by `discover_from_brief`.

---

#### D3 (P2) — Add structured pipeline observability
**File:** `lead_discovery.py`, `contact_enricher.py`

After each stage, emit a structured log line:
```python
log.info(json.dumps({
    "event": "discovery_complete",
    "campaign_id": campaign_id,
    "queries_run": total_q,
    "raw_results": raw_count,
    "after_filter": filtered_count,
    "leads_saved": len(leads),
    "duration_s": round(time.time() - t0, 1)
}))
```

For enrichment:
```python
log.info(json.dumps({
    "event": "enrichment_complete",
    "campaign_id": campaign_id,
    "total_leads": len(leads),
    "real_email": email_real,
    "synthesized": email_synth,
    "needs_email": email_none,
    "hunter_hits": hunter_count,
    "duration_s": round(time.time() - t0, 1)
}))
```

---

### Track E — UX Fixes

#### E1 (P1) — Make search queries editable before running discovery
**File:** `CampaignManager.jsx` — "review" stage

On the brief review screen, render `brief.search_queries` as an editable tag list. Each query is a removable chip with an edit icon. Add an "Add query" button. The edited queries are passed into the campaign brief before `POST /campaigns` is called.

This gives users direct control over what the scraper searches for, which is the single highest-leverage UX change. It also serves as a quality signal — if the queries look irrelevant, users catch it before wasting API credits.

Proposed UI: inline editable chip list below "AI Discovery Paths" with an `[Edit]` toggle that expands to text inputs.

---

#### E2 (P1) — Replace implementation-internal progress messages
**File:** `lead_discovery.py`, `contact_enricher.py` — all `yield {"type": "progress", ...}` calls

| Current | Replace with |
|---|---|
| `"Scraping logic loop 2/5..."` | `"Running search 2 of 5..."` |
| `"Validating signals & enriching logic loops 12/20..."` | `"Finding contact info for lead 12 of 20..."` |
| `"Saving finalized profiles to Connectr Hub..."` | `"Saving leads to your campaign..."` |

Also pass per-query result counts in progress events so the frontend can show:
> `"Search 3 of 5 — 8 candidates found"`

---

#### E3 (P1) — Show email discovery rate on success screen
**File:** `campaigns.py` — final yield, `CampaignManager.jsx` success stage

Add to the `"final"` event:
```python
yield json.dumps({
    "type": "final",
    "imported": len(leads),
    "email_found": sum(1 for l in leads if l.get("email") and l.get("status") != "Guessed"),
    "email_guessed": sum(1 for l in leads if l.get("status") == "Guessed"),
    "needs_email": sum(1 for l in leads if l.get("status") == "Needs Email"),
    "preview": leads[:5]
}) + "\n"
```

Display on the success screen:
> **23 leads found** — 11 verified emails · 8 guessed · 4 need manual lookup

---

#### E4 (P2) — Filter "Needs Email" leads in Email Hub
**File:** `EmailHub.jsx`

Add a filter tab bar: `All | Has Email | Needs Email`. Default to "Has Email" tab. "Needs Email" leads are still accessible but not the default view, preventing users from attempting to draft emails they cannot send.

---

## Execution Order & Dependencies

```
Week 1 — Unblock the basics (all P0s)
  A1  Fix env-var name mismatch          (10 min, one-line change)
  A2  Raise max_tokens to 1,500          (2 min, one-line change)
  B1  Fix Google selector + add &num=20  (30 min)
  B2  Parse LinkedIn snippets properly   (2 hours)
  C1  Skip social URL fetches            (30 min)
  C2  Fix email synthesis patterns       (1 hour)

Week 2 — Make enrichment actually work (P1s)
  A3  Add brief validation + error UI    (2 hours backend + 1 hour frontend)
  A4  Pre-process website content        (1 hour)
  B3  Fix job listing URL exclusion      (30 min)
  B4  Expand role detection              (30 min)
  B5  Add per-query result logging       (1 hour)
  C3  Integrate Hunter.io               (3 hours + account setup)
  C4  Fix max_to_enrich loop            (10 min)
  D1  Move blocking calls off event loop (3 hours — use run_in_executor)
  D2  Remove scraper_service.py          (30 min)
  E1  Editable search queries in UI      (4 hours)
  E2  Fix progress messages              (30 min)
  E3  Email rate on success screen       (1 hour)

Week 3 — Polish & observability (P2s)
  A5  Locale normalization in prompt     (30 min)
  C5  MX record check                    (1 hour)
  C6  Expand BAD_EMAIL_DOMAINS           (15 min)
  D3  Structured pipeline logging        (2 hours)
  E4  Needs Email filter in Email Hub    (1 hour)
```

Total estimated effort: ~3 weeks of focused engineering.

---

## What the Fixed Pipeline Looks Like

```
User enters website URL
        ↓
web_extractor.py
  → Jina.ai (primary, markdown)        [fixed: standardized SCRAPEDO_TOKEN]
  → Direct requests (fallback 1)
  → scrape.do (fallback 2)
  → _focus_content(): strip nav noise, truncate to 8,000 chars
        ↓
company_analyzer.py
  → Perplexity Sonar, max_tokens=1500  [fixed: was 600]
  → _validate_brief(): reject if < 2 queries or quality < 0.40
  → Returns: services, icp_summary, search_queries (5+), lead_signals
        ↓
[User reviews brief, CAN edit search_queries]  [new UX]
        ↓
discover_from_brief()
  → Per query: Google via scrape.do
    - &num=20&hl=en                    [fixed: was &num missing]
    - Multi-selector fallback          [fixed: was single stale selector]
    - Path-aware job URL exclusion     [fixed: was domain-only]
    - Logs: "Query 2/5 — 7 found"     [fixed: was silent]
  → _parse_linkedin_snippet()          [new: extracts name/role/company]
  → Score based on ICP signal overlap
        ↓
enrich_leads_with_email()
  → If social URL: skip fetch          [fixed: was always fetching login wall]
  → If HUNTER_API_KEY set: Hunter.io lookup  [new]
  → HTML scrape of company website
  → Contact page scrape
  → Synthesize first.last@domain       [fixed: was first@ only]
  → MX record check on synthesis       [new]
        ↓
upsert_leads_to_hub()
  → Leads saved with email, candidates[], status
        ↓
Success screen: "23 leads — 11 verified, 8 guessed, 4 need lookup"  [new]
```

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Hunter.io adds cost per lookup | Medium | Gate behind `HUNTER_API_KEY`; not called if key absent. Keep fallback chain. |
| LinkedIn further restricts scraping | High | LinkedIn snippets from Google are public. We're reading the snippet, not the page. |
| Google changes selector again | Medium | Multi-selector chain reduces single-point-of-failure. Add selector health check log. |
| scrape.do rate limits / costs | Medium | Cache scrape.do responses by query hash with 24h TTL. |
| `_parse_linkedin_snippet` misses edge cases | Medium | Fall back to `hit["title"][:60]` for name; role stays empty rather than wrong. |
| Hunter.io returns false positives | Low | Confidence threshold ≥ 50 filters low-confidence lookups. |

---

## Open Questions (Decisions Needed Before Implementation)

1. **Hunter.io vs alternatives** — Hunter.io is the most established. Apollo.io has a larger database but higher cost. Clearbit is enterprise-focused. Snov.io is cheaper. Which do you want to start with?

2. **Should "Needs Email" leads be saved at all?** — Currently they are saved and visible in the Email Hub. Option: don't save them, show them only in a post-discovery review modal where the user can manually add an email before importing. This prevents Email Hub pollution.

3. **Search query editing UX depth** — Option A: simple text inputs per query (editable list). Option B: full query builder with field selectors (platform, keyword, intent type). Option A is 4 hours of work; Option B is 2–3 days.

4. **Async refactor scope** — Moving from `requests` to `httpx.AsyncClient` is the clean solution for D1 but touches every service file. Alternatively, `run_in_executor` wrapping in the orchestrator is a 30-minute patch. Which do you prefer?

5. **What verticals/ICPs will most campaigns target?** — If the majority of clients target professional services (lawyers, consultants, agencies), the LinkedIn snippet parser should be tuned specifically for those title patterns.

import os
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup, Comment

# -------------------------------------------------------------------------
# CONFIG / CONSTANTS
# -------------------------------------------------------------------------
UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

# Tags that usually contain valuable content
SEMANTIC_TAGS = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "li", "dt", "dd", "blockquote"
]

# Classes/IDs that often indicate main content areas (used for weighting/selection)
CONTENT_HINTS = [
    "content", "main", "body", "article", "section",
    "feature", "service", "card", "box", "tile", "grid",
    "text", "desc", "hero", "intro"
]

# Negative indicators for noise removal
NOISE_SELECTORS = [
    "nav", "header", "footer", "aside", "form",
    ".nav", ".menu", ".footer", ".sidebar", ".cookie", ".banner",
    ".login", ".signup", ".modal", ".popup", ".ad", ".advert",
    "#nav", "#menu", "#footer", "#sidebar",
    "[role='navigation']", "[role='banner']", "[role='contentinfo']"
]

# Regex for "junk" lines often found in UI
JUNK_PATTERNS = [
    r"(?i)^copyright\s+\d{4}",
    r"(?i)^all rights reserved",
    r"(?i)enable javascript",
    r"(?i)cookie policy",
    r"(?i)accept all",
    r"(?i)privacy policy",
    r"(?i)terms of use",
    r"(?i)skip to content",
    r"(?i)log\s?in",
    r"(?i)sign\s?up",
    r"(?i)register",
    r"(?i)subscribe",
    r"(?i)follow us",
    r"(?i)enter your email",
]

# JS Shell Indicators
JS_SHELL_MARKERS = [
    "window.__next", "__next_data__",      # Next.js
    "__nuxt",                              # Nuxt.js
    "window.__remixContext",               # Remix
    "<!--! bad_request_modal -->",
    "enable javascript",
    "javascript is disabled",
    "needs javascript"
]

# -------------------------------------------------------------------------
# HELPERS
# -------------------------------------------------------------------------

def _clean_soup(soup: BeautifulSoup) -> None:
    """Pre-cleans the soup by removing scripts, styles, and known noise areas."""
    # 1. Remove non-visible tags
    for tag in soup(["script", "style", "noscript", "svg", "canvas", "iframe", "object", "embed", "meta", "link"]):
        tag.decompose()
    
    # 2. Remove comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()
        
    # 3. Remove semantic noise areas (nav, footer, etc)
    for sel in NOISE_SELECTORS:
        for tag in soup.select(sel):
            tag.decompose()

def _is_junk(text: str) -> bool:
    """Returns True if the line looks like UI noise."""
    if len(text) < 3: 
        return True
    for p in JUNK_PATTERNS:
        if re.search(p, text):
            return True
    return False

def _extract_semantic_text(soup: BeautifulSoup) -> str:
    """
    Extracts text by iterating over the document in reading order, 
    prioritizing semantic tags and strictly content-bearing blocks.
    Aggregates into a clean string.
    """
    # We will collect lines.
    lines = []
    
    # Helper to process a potential text node/tag
    def process_node(node):
        # If it's a simple string
        if isinstance(node, str):
            t = node.strip()
            if t and not _is_junk(t):
                return t
            return None
            
        # If it's an element
        name = node.name
        
        # Structure handling
        # We want to insert line breaks for block elements
        is_block = name in ["div", "section", "article", "p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "br"]
        
        text = node.get_text(" ", strip=True)
        # Filters
        if not text:
            return None
        if len(text) < 3: # Skip tiny snippets
            return None
        if _is_junk(text):
            return None
            
        return text

    # Iterate over all specific semantic candidates in meaningful order?
    # Actually, often better to traverse:
    # We want to capture text in order of appearance.
    
    # Strategy: Find all relevant semantic tags, sort by position (document order is implicit in find_all w/o recursive mess)
    # But nested tags duplicate text. e.g. <div><p>Hello</p></div> -> div has "Hello", p has "Hello".
    
    # Better Strategy: 
    # Select specific leaf-ish nodes or robust block nodes.
    # Let's target: h1-h6, p, li. 
    # ALSO: div/span that are NOT parents of these, but contain text directly?
    # Simplest reliable method: soup.get_text() but carefully managed? 
    # No, that merges everything.
    
    # Hybrid: 
    # 1. Extract H1-H6 separately (titles)
    # 2. Extract P and LI (body)
    # 3. Scan for "Cards" (divs with specific class names) that might not use <p> tags.
    
    seen_text = set()
    collected = []
    
    # A. Headings (High Value)
    for tag in soup.find_all(re.compile(r"^h[1-6]$")):
        t = tag.get_text(" ", strip=True)
        if t and t not in seen_text and not _is_junk(t):
            collected.append(t.upper()) # Emphasize headers
            seen_text.add(t)
            
    # B. Paragraphs & Lists (Body)
    # We will mix them by appearance if possible, but finding all and appending works for aggregation.
    body_tags = soup.find_all(["p", "li", "dt", "dd", "blockquote"])
    for tag in body_tags:
        t = tag.get_text(" ", strip=True)
        if t and len(t) > 10 and t not in seen_text and not _is_junk(t):
            collected.append(t)
            seen_text.add(t)
            
    # C. Catch-all: specific "content" divs that might be missed (e.g. text in a generic div)
    # This is risky as it might duplicate. We rely on 'seen_text' to dedupe exact matches.
    # To be safe, we only look at divs directly containing text (no child block tags)
    for tag in soup.find_all("div"):
        # simple heuristic: if it has no child tags, or only inline tags
        if not tag.find(["div", "p", "table", "ul", "ol", "section", "article"]):
            t = tag.get_text(" ", strip=True)
            if t and len(t) > 25 and t not in seen_text and not _is_junk(t):
                collected.append(t)
                seen_text.add(t)

    # 4. Meta Description (often the best summary)
    desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    if desc_tag:
        d = desc_tag.get("content", "").strip()
        if d and d not in seen_text:
            collected.insert(0, f"SUMMARY: {d}") # prepend
            seen_text.add(d)

    return "\n\n".join(collected)

def _detect_js_shell(html: str) -> bool:
    """Checks if the raw HTML is likely a JS shell with minimal content."""
    h = html.lower()
    # 1. specific framework markers
    for m in JS_SHELL_MARKERS:
        if m in h:
            return True
            
    # 2. Content sparsity heuristic
    # If body is < 1000 chars but 80% is scripts (already cleaned in caller? no raw html)
    # simpler: if stripped text is very short
    soup = BeautifulSoup(html, "html.parser")
    _clean_soup(soup)
    text = soup.get_text(strip=True)
    if len(text) < 300: # Very suspicious for a "modern" main page
        return True
        
    return False

# -------------------------------------------------------------------------
# MAIN EXPORT
# -------------------------------------------------------------------------

def extract_main_text(url: str, timeout: int = 20) -> tuple[str, dict]:
    """
    Robustly extracts main content from a URL.
    - Handles standard HTML
    - Detects JS shells and fallbacks to Rendered Fetch (Scrape.do)
    - Returns (cleaned_text, metadata)
    """
    meta = {
        "method": "direct",
        "url": url,
        "status_code": 0,
        "bytes_in": 0,
        "fallback_reason": None
    }
    
    try:
        # 1. Direct Fetch
        resp = requests.get(url, headers=UA, timeout=timeout, allow_redirects=True)
        meta["status_code"] = resp.status_code
        meta["bytes_in"] = len(resp.content)
        
        resp.raise_for_status()
        html = resp.text
        
        # 2. Detect JS Shell / Blockers
        is_js_shell = _detect_js_shell(html)
        
        text = ""
        
        # 3. If standard, try extract
        if not is_js_shell:
            soup = BeautifulSoup(html, "html.parser")
            _clean_soup(soup)
            text = _extract_semantic_text(soup)
        
        # 4. Logic for fallback
        # Fallback if: Explicitly detected JS shell OR extracted text is disappointingly short
        should_fallback = is_js_shell or len(text) < 600
        
        if should_fallback:
            TOKEN = os.getenv("SCRAPEDO_TOKEN") or os.getenv("SCRAPE_DO_TOKEN")
            if TOKEN:
                meta["method"] = "scrapedo"
                meta["fallback_reason"] = "js_shell" if is_js_shell else "low_text_yield"
                
                # print(f"Fallback triggered for {url}: {meta['fallback_reason']}")
                
                # Encode target URL for Scrape.do
                target = urllib.parse.quote(url, safe="")
                # render=true is key for JS
                api_url = f"http://api.scrape.do/?token={TOKEN}&url={target}&render=true"
                
                r2 = requests.get(api_url, timeout=40)
                meta["status_code"] = r2.status_code # update status to rendered result
                meta["bytes_in"] = len(r2.content)
                
                if r2.ok:
                    html2 = r2.text
                    soup2 = BeautifulSoup(html2, "html.parser")
                    _clean_soup(soup2)
                    text2 = _extract_semantic_text(soup2)
                    
                    # If rendered produced more text, use it
                    if len(text2) > len(text):
                        text = text2
            else:
                meta["fallback_error"] = "no_token_provided"
                
        # 5. Final Polish
        # Normalize whitespace
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        
        # Truncate if massive (optional, per reqs leq 12k chars)
        if len(text) > 12000:
            text = text[:12000] + "... [TRUNCATED]"
            
        meta["final_char_count"] = len(text)
        meta["confidence"] = "high" if len(text) > 1000 else "low"
        
        return text, meta

    except Exception as e:
        return f"Extraction Error: {str(e)}", {"error": str(e)}

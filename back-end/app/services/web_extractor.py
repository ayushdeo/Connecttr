import os
import re
import logging
import urllib.parse
import requests
from bs4 import BeautifulSoup
import markdownify

log = logging.getLogger("nexus")

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

def _html_to_markdown(html: str) -> str:
    """Converts HTML to Markdown safely while stripping out scripts/styles inline."""
    soup = BeautifulSoup(html, "html.parser")
    # Clean scripts and styles from soup before markdownify
    for tag in soup(["script", "style", "noscript", "svg", "canvas", "iframe", "object", "embed", "meta", "link"]):
        tag.decompose()
        
    cleaned_html = str(soup)
    md = markdownify.markdownify(cleaned_html, heading_style="ATX", strip=["img"], bullets="-")
    
    # Normalize whitespaces: max 2 consecutive newlines, strip leading/trailing
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    return md

def _detect_js_shell(html: str) -> bool:
    """Checks if the raw HTML is likely a JS shell with minimal content."""
    h = html.lower()
    for m in JS_SHELL_MARKERS:
        if m in h:
            return True
            
    # Content sparsity heuristic
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text(strip=True)
    if len(text) < 300: 
        return True
        
    return False

# -------------------------------------------------------------------------
# MAIN EXPORT
# -------------------------------------------------------------------------

def extract_main_text(url: str, timeout: int = 20) -> tuple[str, dict]:
    """
    Robustly extracts main content from a URL via Waterfall.
    1. Primary: r.jina.ai (handles JS & returns markdown natively)
    2. Fallback 1: Direct requests + markdownify (if non-JS shell)
    3. Fallback 2: scrape.do (JS rendering) + markdownify
    """
    meta = {
        "method": "jina",
        "url": url,
        "status_code": 0,
        "bytes_in": 0,
        "fallback_reason": None
    }
    
    text = ""
    log.debug("[extract] START url=%s", url)

    # -------------------------------------------------------
    # 1. Primary: Jina AI (Markdown & JS handling)
    # -------------------------------------------------------
    try:
        jina_url = f"https://r.jina.ai/{url}"
        log.debug("[extract] trying Jina: %s", jina_url)
        resp = requests.get(jina_url, headers=UA, timeout=timeout)
        meta["status_code"] = resp.status_code
        meta["bytes_in"] = len(resp.content)
        log.debug("[extract] Jina status=%d bytes=%d", resp.status_code, len(resp.content))

        if resp.ok and len(resp.text) > 300:
            text = resp.text
            text = re.sub(r"\n{3,}", "\n\n", text).strip()
            log.debug("[extract] Jina OK chars=%d", len(text))
        else:
            log.warning("[extract] Jina skipped: ok=%s len=%d", resp.ok, len(resp.text))
    except Exception as e:
        meta["fallback_reason"] = f"jina_failed: {str(e)}"
        log.warning("[extract] Jina exception: %s", e)

    # -------------------------------------------------------
    # 2. Fallbacks
    # -------------------------------------------------------
    if not text:
        meta["method"] = "fallback"
        log.debug("[extract] falling back to direct fetch")
        try:
            resp = requests.get(url, headers=UA, timeout=timeout, allow_redirects=True)
            meta["status_code"] = resp.status_code
            html = resp.text
            is_js_shell = _detect_js_shell(html)
            log.debug("[extract] direct fetch status=%d js_shell=%s html_len=%d", resp.status_code, is_js_shell, len(html))

            if not is_js_shell:
                text = _html_to_markdown(html)
                meta["method"] = "direct"
                log.debug("[extract] direct markdown chars=%d", len(text))

            if is_js_shell or len(text) < 600:
                meta["fallback_reason"] = "js_shell" if is_js_shell else "low_text_yield"
                TOKEN = os.getenv("SCRAPEDO_TOKEN")
                log.debug("[extract] escalating to scrape.do — token_present=%s reason=%s", bool(TOKEN), meta["fallback_reason"])
                if TOKEN:
                    meta["method"] = "scrapedo"
                    target = urllib.parse.quote(url, safe="")
                    api_url = f"http://api.scrape.do/?token={TOKEN}&url={target}&render=true"
                    r2 = requests.get(api_url, timeout=40)
                    meta["status_code"] = r2.status_code
                    log.debug("[extract] scrape.do status=%d bytes=%d", r2.status_code, len(r2.content))
                    if r2.ok:
                        text2 = _html_to_markdown(r2.text)
                        log.debug("[extract] scrape.do markdown chars=%d", len(text2))
                        if len(text2) > len(text):
                            text = text2
                    else:
                        log.warning("[extract] scrape.do non-OK: %s", r2.text[:200])
                else:
                    meta["fallback_error"] = "no_scrapedo_token_provided"
                    log.error("[extract] SCRAPEDO_TOKEN missing from environment")

        except Exception as e:
            log.error("[extract] fallback exception: %s", e, exc_info=True)
            if not text:
                return f"Extraction Error: {str(e)}", {"error": str(e)}

    # -------------------------------------------------------
    # 5. Final Polish & Truncate
    # -------------------------------------------------------
    # Keep up to 20,000 characters for rich context
    if len(text) > 20000:
        text = text[:20000] + "\n\n... [TRUNCATED FOR LENGTH]"
        
    meta["final_char_count"] = len(text)
    meta["confidence"] = "high" if len(text) > 1000 else "low"
    
    return text, meta
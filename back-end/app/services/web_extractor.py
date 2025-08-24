# app/services/web_extractor.py
import os, re, urllib.parse, requests
from bs4 import BeautifulSoup

UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}

# ---------- helpers ----------
def _clean(soup: BeautifulSoup) -> None:
    for tag in soup(["script", "style", "noscript", "svg", "canvas", "footer", "header", "nav", "form", "iframe"]):
        tag.decompose()

def _text_len(el) -> int:
    try:
        return len(el.get_text(" ", strip=True))
    except Exception:
        return 0

def _link_density(el) -> float:
    text_len = _text_len(el)
    if text_len == 0:
        return 0.0
    links_text = sum((_text_len(a) for a in el.find_all("a")), 0)
    return links_text / max(1, text_len)

def _best_block(soup: BeautifulSoup):
    # prefer semantic containers
    candidates = []
    for sel in ["main", "article", "section", "div"]:
        candidates.extend(soup.select(sel))
    # score: longer text with lower link density wins
    best, best_score = None, 0
    for el in candidates:
        tlen = _text_len(el)
        if tlen < 200:  # ignore tiny blocks
            continue
        ld = _link_density(el)
        score = tlen * (1.0 - 0.7 * ld)
        if score > best_score:
            best, best_score = el, score
    return best

def _normalize(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text

def _extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    _clean(soup)
    block = _best_block(soup)
    if block:
        return _normalize(block.get_text(" ", strip=True))
    # fallback: whole body
    return _normalize(soup.get_text(" ", strip=True))

def _looks_js_blocked(html: str) -> bool:
    h = (html or "").lower()
    return any([
        "please enable javascript" in h,
        "cloudflare" in h,
        "window.__next" in h or "__next_data__" in h,  # Next.js shell
    ])

# ---------- main ----------
def extract_main_text(url: str, timeout: int = 20):
    meta = {"method": "direct"}
    r = requests.get(url, timeout=timeout, headers=UA, allow_redirects=True)
    html = r.text
    text = _extract_text_from_html(html)
    meta.update({"status_code": r.status_code, "bytes": len(html), "final_url": str(r.url)})

    # If content looks thin/JS-gated, try Scrape.do render (optional)
    if len(text) < 600 or _looks_js_blocked(html):
        token = os.getenv("SCRAPEDO_TOKEN")
        if token:
            meta["method"] = "scrapedo"
            target = urllib.parse.quote(url, safe="")
            api = f"http://api.scrape.do/?token={token}&url={target}&render=true"
            r2 = requests.get(api, timeout=30)
            meta["fallback_status"] = r2.status_code
            meta["fallback_bytes"] = len(r2.text)
            if r2.ok:
                html2 = r2.text
                text2 = _extract_text_from_html(html2)
                if len(text2) > len(text):
                    text = text2

    return text[:12000], meta
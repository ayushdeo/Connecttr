# app/services/company_analyzer.py
import os, re, json, requests
from typing import Optional, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv, find_dotenv

# Load env from .env
load_dotenv()

class AnalyzerHTTPError(RuntimeError): ...
class AnalyzerConfigError(RuntimeError): ...

def _extract_json_block(text: str) -> Dict[str, Any]:
    """
    Pull the first JSON object from an LLM response (handles prose wrappers).
    """
    if not text:
        return {}
    # Try fenced code blocks first
    m = re.search(r"```(?:json)?\s*({.*?})\s*```", text, flags=re.S|re.I)
    if not m:
        m = re.search(r"({.*})", text, flags=re.S)
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except Exception:
        return {}

def _normalize_brief(d: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(d or {})
    d.setdefault("services", [])
    d.setdefault("icp_summary", "")
    d.setdefault("lead_signals", [])
    d.setdefault("search_queries", [])
    d.setdefault("exclude_terms", [])
    d.setdefault("exclude_domains", [])
    d.setdefault("outreach_angles", [])
    try:
        d["quality"] = float(d.get("quality", 0.0))
    except Exception:
        d["quality"] = 0.0
    return d

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def analyze_company_brief(basis_text: str, website: Optional[str] = None) -> Dict[str, Any]:
    """
    Turn website text (or a user prompt) into a structured brief we can use to
    drive scraping + intent rules. Returns a dict with keys:
      services, icp_summary, lead_signals, search_queries, exclude_terms,
      exclude_domains, outreach_angles, quality (0..1)
    """
    base_url = os.getenv("PERPLEXITY_BASE_URL", "https://api.perplexity.ai")
    model    = os.getenv("PERPLEXITY_MODEL", "sonar")
    api_key  = os.getenv("PERPLEXITY_API_KEY")
    timeout  = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
    if not api_key:
        raise AnalyzerConfigError("PERPLEXITY_API_KEY missing")

    system = "You are a B2B lead-gen strategist. Be concise and deterministic."
    user = f"""
You are an intelligent analysis engine designed to extract a high-quality outbound campaign profile from any given context.
Your goal is to make the process feel "magical" by prioritizing automation, accuracy, and rigorous evidence evaluation.

Client website: {website or "(none)"}

BASIS TEXT (from website or user prompt, formatted as Markdown):
\"\"\"{(basis_text or '')[:20000]}\"\"\"

## EXTRACTION PIPELINE & CLASSIFICATION (Internal Process)
Before generating output, internally perform these steps:
1. Classify the page roles (Homepage, About, Services, Pricing, Blog) to weight signal importance.
2. Extract Metadata (Titles, Heroes, H1-H3).
3. Evaluate Core Elements (Positioning, offers, target audiences, and explicit pain points).
4. Extract Structured clues (CTAs, footer links, JSON-LD context if visible).

## CONFIDENCE SCORING RULES
Evaluate your confidence from 0.0 to 1.0 for the complete profile:
* 0.9+ → explicitly stated multiple times across the site
* 0.7–0.89 → clearly implied across credible sources
* 0.5–0.69 → weak inference
* <0.5 → unreliable / guess
Determine the absolute lowest confidence among your core evaluations (Target Audience & Core Offer). Output this exact float as the `quality` score.

## FAILURE HANDLING (CRITICAL)
You MUST NOT fail. If the content is heavily missing or scraping resulted in a JS-shell, extract whatever partial signals exist, heavily penalize the `quality` score (<0.55), and leave unknown arrays empty. Do NOT hallucinate claims or generic filler.

## OUTPUT SCHEMA (MANDATORY)
Output ONLY a JSON object matching this exact shape. Combine your deep analysis into these exact keys:

{{
  "services": [ "Exact products or services extracted, backed by site evidence." ],
  "icp_summary": "Hyper-specific Ideal Customer Profile detailing what problems they have that this company solves.",
  "lead_signals": [ "Highly distinct intent markers, platforms, or tools the ICP uses." ],
  "search_queries": [ "Exact search query patterns representing buyer intent." ],
  "exclude_terms": [ "Strict rules to EXCLUDE irrelevant leads (e.g. job postings, supplier portfolios, generic tips)." ],
  "exclude_domains": [ "Specific competitor or partner platforms to avoid." ],
  "outreach_angles": [ "Evidence-backed conversational angles for direct outreach messages." ],
  "quality": 0.0
}}

Return JSON only. No extra conversational text or markdown wrappers.
"""

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",    "content": user},
        ],
        "temperature": 0.0,
        "max_tokens": 600,
    }

    r = requests.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=timeout,
    )
    if r.status_code != 200:
        raise AnalyzerHTTPError(f"HTTP {r.status_code} | model={model} | body={r.text[:400]}")

    content = r.json()["choices"][0]["message"]["content"].strip()
    data = _extract_json_block(content)
    return _normalize_brief(data)
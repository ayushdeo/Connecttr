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
We are setting up an outbound campaign.

Client website: {website or "(none)"}

BASIS TEXT (from website or user prompt):
\"\"\"{(basis_text or '')[:8000]}\"\"\"  # truncated

Tasks:
1) Infer the client's services and ICP (ideal customer profile).
2) Propose how to find buyers online (signals, platforms, and query patterns).
3) Provide rules to EXCLUDE irrelevant leads (job postings, supplier portfolios, generic tips).
4) Output ONLY JSON with this exact shape:

{{
  "services": [ "string", ... ],
  "icp_summary": "string",
  "lead_signals": [ "string", ... ],
  "search_queries": [ "string", ... ],
  "exclude_terms": [ "string", ... ],
  "exclude_domains": [ "string", ... ],
  "outreach_angles": [ "string", ... ],
  "quality": 0.0
}}

Return JSON only. No extra text.
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
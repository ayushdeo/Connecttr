# app/services/company_analyzer.py
import re
from typing import Optional, Dict, Any, Tuple
from app.services.llm_client import call_llm, extract_json


class AnalyzerConfigError(RuntimeError): ...


def _focus_content(text: str, max_chars: int = 8000) -> str:
    """Strip navigation noise and truncate to information-dense content."""
    lines = text.split("\n")
    # Drop lines that are pure markdown link lists (nav menus, footers)
    lines = [l for l in lines if not re.match(r"^\[.+\]\(.+\)\s*$", l.strip())]
    focused = "\n".join(lines)
    focused = re.sub(r"\n{3,}", "\n\n", focused).strip()
    return focused[:max_chars]


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


def _validate_brief(d: Dict[str, Any]) -> Tuple[bool, str]:
    if len(d.get("search_queries", [])) < 2:
        return False, "Not enough search queries generated — website had too little content to analyze."
    if len(d.get("icp_summary", "")) < 30:
        return False, "Could not identify your target customer from the website."
    if d.get("quality", 0.0) < 0.40:
        return False, "Website content was too thin or blocked to extract a reliable profile."
    return True, ""


def analyze_company_brief(basis_text: str, website: Optional[str] = None) -> Dict[str, Any]:
    """
    Turn website text (or a free-form user prompt) into a structured campaign brief.
    Uses Gemini 2.0 Flash via the shared llm_client.
    """
    focused = _focus_content(basis_text or "")

    system = (
        "You are a B2B lead-gen strategist. "
        "Output only valid JSON — no markdown, no commentary, no prose. "
        "All output must be in English regardless of input language."
    )

    user = f"""Extract a high-quality outbound campaign profile from the content below.

Client website: {website or "(none)"}

CONTENT:
\"\"\"{focused}\"\"\"

Before generating output, determine:
1. The exact product or service being offered.
2. Who the ideal buyer is and what specific pain they experience.
3. How buyers signal intent online (social posts, forum questions, job listings, portfolio sites).
4. 5 specific Google search queries that would surface those buyers today.

CONFIDENCE RULES (quality field, 0.0 to 1.0):
* 0.9+ = explicitly stated multiple times across the content
* 0.7-0.89 = clearly implied
* 0.5-0.69 = weak inference
* <0.5 = insufficient or missing content

If content is sparse or blocked, leave arrays empty and score quality below 0.5. Never hallucinate.

Output ONLY this JSON object — nothing else:
{{
  "services": ["exact products/services found in the content"],
  "icp_summary": "specific Ideal Customer Profile: who they are, what pain they have, why they buy",
  "lead_signals": ["distinct intent markers, platforms, tools, or behaviours the ICP shows"],
  "search_queries": ["5 specific Google search query strings targeting buyer intent signals"],
  "exclude_terms": ["terms that would surface irrelevant results to exclude"],
  "exclude_domains": ["competitor or irrelevant platforms to skip when scraping"],
  "outreach_angles": ["evidence-backed hooks for personalised outreach messages"],
  "quality": 0.0
}}"""

    content = call_llm(system, user, max_tokens=1500, temperature=0.0)
    data = extract_json(content)
    brief = _normalize_brief(data)

    valid, reason = _validate_brief(brief)
    brief["_validation_passed"] = valid
    brief["_validation_reason"] = reason

    return brief

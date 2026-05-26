# app/services/perplexity_client.py
# Intent classifier — now powered by Gemini via the shared llm_client.
import re
from app.services.llm_client import call_llm, extract_json, LLMConfigError, LLMHTTPError


class PerplexityHTTPError(LLMHTTPError): ...   # kept for backward compat
class PerplexityConfigError(LLMConfigError): ...


def classify_intent(text: str, campaign_context: dict) -> dict:
    """
    Classify whether a text snippet shows buying intent aligned with the campaign.
    Returns: {intent_score: 0-100, intent_type: direct|indirect|weak|none, reasoning: str}
    """
    normalized = (text or "").strip()
    if len(normalized) < 8:
        return {"intent_score": 0, "intent_type": "none", "reasoning": "Text too short"}

    system = "You are a B2B outbound signal classifier. Return strict JSON. No commentary."

    user = f"""Analyze the INPUT text to determine if it shows intent aligned with the campaign.

CAMPAIGN CONTEXT:
- ICP: {campaign_context.get('icp_summary', 'N/A')}
- Problem/Angles: {campaign_context.get('outreach_angles', 'N/A')}
- Value Prop/Services: {campaign_context.get('services', 'N/A')}

INPUT:
{normalized}

Return ONLY this JSON:
{{
  "intent_score": 0-100,
  "intent_type": "direct" | "indirect" | "weak" | "none",
  "reasoning": "brief explanation"
}}"""

    try:
        content = call_llm(system, user, max_tokens=200, temperature=0.0)
        data = extract_json(content)
        if not data:
            return {"intent_score": 0, "intent_type": "none", "reasoning": "Failed to parse LLM response"}
        # Normalise 0-1 float to 0-100 if model outputs it that way
        score = data.get("intent_score", 0)
        if isinstance(score, float) and 0 < score <= 1.0:
            data["intent_score"] = int(score * 100)
        return data
    except Exception as e:
        return {"intent_score": 0, "intent_type": "none", "reasoning": f"LLM error: {e}"}


def score_intent_freeform(text: str) -> float:
    res = classify_intent(text, {})
    return float(res.get("intent_score", 0)) / 100.0

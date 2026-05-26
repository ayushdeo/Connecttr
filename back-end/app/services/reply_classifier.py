# app/services/reply_classifier.py
# Reply classifier — now powered by Gemini via the shared llm_client.
from app.services.llm_client import call_llm, extract_json

SYSTEM_PROMPT = "You classify inbound B2B email replies. Return strict JSON. No commentary."


class ClassifierError(RuntimeError): ...


def classify_reply(original_body: str, reply_body: str) -> dict:
    user = f"""Classify this inbound email reply based on the original outreach.

ORIGINAL EMAIL:
{original_body[:1000]}

REPLY RECEIVED:
{reply_body[:2000]}

Return ONLY this JSON:
{{
  "category": "meeting" | "positive" | "objection" | "later" | "referral" | "unsubscribe" | "not_interested",
  "confidence": 0-100,
  "summary": "brief explanation"
}}"""

    try:
        content = call_llm(SYSTEM_PROMPT, user, max_tokens=300, temperature=0.0)
        data = extract_json(content)
        if not data:
            return {"category": "not_interested", "confidence": 0, "summary": "Failed to parse LLM response"}
        return data
    except Exception as e:
        return {"category": "not_interested", "confidence": 0, "summary": f"LLM error: {e}"}

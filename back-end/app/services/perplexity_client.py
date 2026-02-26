# app/services/perplexity_client.py
# app/services/perplexity_client.py
import os, re, requests
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv, find_dotenv

# Explicitly load the .env file
load_dotenv()

class PerplexityHTTPError(RuntimeError): ...
class PerplexityConfigError(RuntimeError): ...

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
def classify_intent(text: str, campaign_context: dict) -> dict:
    """
    Generalized B2B outbound signal classifier.
    Expects campaign_context with: icp_definition, problem_statement, value_prop_summary
    """
    normalized = (text or "").strip()
    if len(normalized) < 8:
        return {"intent_score": 0, "intent_type": "none", "reasoning": "Text too short"}

    base_url = os.getenv("PERPLEXITY_BASE_URL", "https://api.perplexity.ai")
    model    = os.getenv("PERPLEXITY_MODEL", "sonar")
    api_key  = os.getenv("PERPLEXITY_API_KEY")
    timeout  = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
    
    if not api_key:
        raise PerplexityConfigError("PERPLEXITY_API_KEY missing")

    system_prompt = "You are a B2B outbound signal classifier. Return strict JSON. No commentary."
    
    user_prompt = f"""
Task: Analyze the INPUT text to determine if it shows intent that aligns with the target campaign.

CAMPAIGN CONTEXT:
- ICP: {campaign_context.get('icp_definition', 'N/A')}
- Problem: {campaign_context.get('problem_statement', 'N/A')}
- Value Prop: {campaign_context.get('value_prop_summary', 'N/A')}

INPUT:
{normalized}

Return strict JSON:
{{
  "intent_score": 0-100,
  "intent_type": "direct" | "indirect" | "weak" | "none",
  "reasoning": "brief explanation"
}}
"""

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.0,
        "max_tokens": 200
    }

    r = requests.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=timeout,
    )

    if r.status_code != 200:
        print(f"!!! PERPLEXITY ERROR {r.status_code}: {r.text}")
        raise PerplexityHTTPError(f"HTTP {r.status_code} | model={model} | body={r.text[:400]}")

    import json
    content = r.json()["choices"][0]["message"]["content"].strip()
    # Extract JSON block
    m = re.search(r"\{.*\}", content, flags=re.S)
    if not m:
        return {"intent_score": 0, "intent_type": "none", "reasoning": "Failed to parse LLM response"}
        
    try:
        data = json.loads(m.group(0))
        # Ensure mapping back to 0-100 if LLM outputs 0.0-1.0 by mistake
        if data.get("intent_score", 0) <= 1.0 and data.get("intent_score", 0) > 0:
             data["intent_score"] = int(data["intent_score"] * 100)
        return data
    except Exception:
        return {"intent_score": 0, "intent_type": "none", "reasoning": "JSON parse error"}

# Deprecated: Keep for minimal backward compatibility if needed during refactor
def score_intent_freeform(text: str) -> float:
    # Minimal stub to avoid breaking old calls immediately, but effectively redirects or returns low score
    res = classify_intent(text, {})
    return float(res.get("intent_score", 0)) / 100.0

import os, re, requests, json
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv, find_dotenv

load_dotenv()

BASE_URL = os.getenv("PERPLEXITY_BASE_URL", "https://api.perplexity.ai")
MODEL    = os.getenv("PERPLEXITY_MODEL", "sonar")
API_KEY  = os.getenv("PERPLEXITY_API_KEY")
TIMEOUT  = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))

class ClassifierError(RuntimeError): ...

SYSTEM_PROMPT = "You classify inbound B2B email replies. Return strict JSON. No commentary."

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def classify_reply(original_body: str, reply_body: str) -> dict:
    if not API_KEY:
        raise ClassifierError("PERPLEXITY_API_KEY missing")

    user_prompt = f"""
Task: Classify this inbound email reply based on the original outreach.

ORIGINAL EMAIL:
{original_body[:1000]}

REPLY RECEIVED:
{reply_body[:2000]}

Return strict JSON:
{{
  "category": "meeting" | "positive" | "objection" | "later" | "referral" | "unsubscribe" | "not_interested",
  "confidence": 0-100,
  "summary": "brief explanation"
}}
"""

    payload = {
        "model": MODEL,
        "temperature": 0.0,
        "max_tokens": 300,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
    }

    r = requests.post(f"{BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type":"application/json"},
        json=payload, timeout=TIMEOUT)

    if r.status_code != 200:
        raise ClassifierError(f"HTTP {r.status_code}: {r.text[:300]}")

    content = r.json()["choices"][0]["message"]["content"].strip()
    m = re.search(r"\{.*\}", content, flags=re.S)
    if not m:
        return {"category": "not_interested", "confidence": 0, "summary": "Failed to parse LLM response"}

    try:
        return json.loads(m.group(0))
    except Exception:
        return {"category": "not_interested", "confidence": 0, "summary": "JSON parse error"}

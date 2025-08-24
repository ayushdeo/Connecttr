import os, requests
from dotenv import load_dotenv, find_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv(find_dotenv(filename="apiKey.env", usecwd=True))

BASE_URL = os.getenv("PERPLEXITY_BASE_URL", "https://api.perplexity.ai")
MODEL    = os.getenv("PERPLEXITY_MODEL", "sonar")  # or sonar-small-online if you prefer
API_KEY  = os.getenv("PERPLEXITY_API_KEY")
TIMEOUT  = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))

class WriterError(RuntimeError): ...

RUBRIC = """
You write short, high-signal cold emails. Use the inputs:
- Company/service: {company_brief}
- Lead context: name={name}, role={role}, company={company}
- Discovery signal: {signal}

Return EXACTLY three options as JSON:
{{
  "A": {{"subject":"...", "body":"..."}},
  "B": {{"subject":"...", "body":"..."}},
  "C": {{"subject":"...", "body":"..."}}
}}

Rules:
- ≤90 chars subject, no clickbait, no emojis.
- 90–140 words body, plain text, no images.
- Personalize with company/role/signal; do NOT fabricate facts.
- Clear CTA (10–15 min call or quick reply).
"""

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def generate_email_templates(company_brief: str, lead: dict, signal: str = "") -> dict:
    if not API_KEY:
        raise WriterError("PERPLEXITY_API_KEY missing")
    user = RUBRIC.format(
        company_brief=(company_brief or "")[:1000],
        name=lead.get("name",""), role=lead.get("role",""),
        company=lead.get("company",""), signal=signal or ""
    )
    payload = {
        "model": MODEL, "temperature": 0.2, "max_tokens": 480,
        "messages": [
            {"role": "system", "content": "Return JSON only."},
            {"role": "user", "content": user}
        ]
    }
    r = requests.post(f"{BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type":"application/json"},
        json=payload, timeout=TIMEOUT)
    if r.status_code != 200:
        raise WriterError(f"HTTP {r.status_code}: {r.text[:300]}")
    text = r.json()["choices"][0]["message"]["content"].strip()
    # naive JSON block extraction
    import re, json
    m = re.search(r"\{.*\}", text, flags=re.S)
    return json.loads(m.group(0)) if m else {"A":{}, "B":{}, "C":{}}
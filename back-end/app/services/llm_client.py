# app/services/llm_client.py
# Shared Google Gemini client (OpenAI-compatible endpoint).
# All LLM calls in the codebase go through call_llm() — one place to swap models.
#
# Free tier (gemini-2.0-flash): 15 RPM · 1M TPM · 1500 RPD
# Get API key: https://aistudio.google.com/app/apikey
import os, re, json, requests
from tenacity import retry, stop_after_attempt, wait_exponential

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"


class LLMConfigError(RuntimeError): ...
class LLMHTTPError(RuntimeError): ...


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def call_llm(system: str, user: str, max_tokens: int = 1000, temperature: float = 0.0) -> str:
    """Call Gemini via its OpenAI-compatible /chat/completions endpoint.
    Retries up to 3× with exponential backoff on transient errors."""
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    if not api_key:
        raise LLMConfigError(
            "GOOGLE_AI_API_KEY missing — get one at https://aistudio.google.com/app/apikey"
        )

    model = os.getenv("GOOGLE_AI_MODEL", "gemini-2.0-flash")
    timeout = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    r = requests.post(
        f"{GEMINI_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=timeout,
    )

    if r.status_code != 200:
        raise LLMHTTPError(f"Gemini HTTP {r.status_code}: {r.text[:400]}")

    return r.json()["choices"][0]["message"]["content"].strip()


def extract_json(text: str) -> dict:
    """Pull the first JSON object from LLM output, handling prose and code-block wrappers."""
    if not text:
        return {}
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S | re.I)
    if not m:
        m = re.search(r"(\{.*\})", text, flags=re.S)
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except Exception:
        return {}

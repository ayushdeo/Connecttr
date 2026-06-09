# app/services/llm_client.py
# Shared Google Gemini client (OpenAI-compatible endpoint).
# All LLM calls in the codebase go through call_llm() — one place to swap models.
#
# Free tier (gemini-2.0-flash): 15 RPM · 1M TPM · 1500 RPD
# Get API key: https://aistudio.google.com/app/apikey
import os, re, json, logging, requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

log = logging.getLogger("nexus")

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"


class LLMConfigError(RuntimeError): ...
class LLMHTTPError(RuntimeError): ...


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=8),
    retry=retry_if_exception_type(LLMHTTPError),  # never retry config/auth errors
)
def call_llm(system: str, user: str, max_tokens: int = 1000, temperature: float = 0.0) -> str:
    """Call Gemini via its OpenAI-compatible /chat/completions endpoint.
    Retries up to 3× with exponential backoff on transient errors."""
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    log.debug("[llm] GOOGLE_AI_API_KEY present=%s prefix=%s", bool(api_key), (api_key or "")[:8])
    if not api_key:
        log.error("[llm] GOOGLE_AI_API_KEY is missing from environment")
        raise LLMConfigError(
            "GOOGLE_AI_API_KEY missing — get one at https://aistudio.google.com/app/apikey"
        )

    model = os.getenv("GOOGLE_AI_MODEL", "gemini-2.0-flash")
    timeout = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
    log.debug("[llm] calling model=%s max_tokens=%d", model, max_tokens)

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
    log.debug("[llm] Gemini response status=%d", r.status_code)

    if r.status_code in (401, 403):
        log.error("[llm] Gemini auth failed (HTTP %d) — GOOGLE_AI_API_KEY is wrong or expired. body=%s", r.status_code, r.text[:300])
        raise LLMConfigError(f"Gemini auth failed (HTTP {r.status_code}): check GOOGLE_AI_API_KEY")

    if r.status_code == 404:
        log.error("[llm] Gemini model not found: model=%s body=%s", model, r.text[:200])
        raise LLMConfigError(f"Gemini model not found: check GOOGLE_AI_MODEL. {r.text[:200]}")

    if r.status_code != 200:
        log.error("[llm] Gemini HTTP error %d: %s", r.status_code, r.text[:400])
        raise LLMHTTPError(f"Gemini HTTP {r.status_code}: {r.text[:400]}")

    content = r.json()["choices"][0]["message"].get("content", "")
    if not content:
        log.error("[llm] Gemini returned empty content — usage=%s", r.json().get("usage"))
        raise LLMHTTPError("Gemini returned empty content — max_tokens may be too low for thinking budget")
    log.debug("[llm] Gemini OK content_len=%d", len(content))
    return content.strip()


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

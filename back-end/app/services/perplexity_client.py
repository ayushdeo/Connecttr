# app/services/perplexity_client.py
# app/services/perplexity_client.py
import os, re, requests
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(filename="apiKey.env", usecwd=True))

class PerplexityHTTPError(RuntimeError): ...
class PerplexityConfigError(RuntimeError): ...

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
def score_intent_freeform(text: str) -> float:
    # Guard: empty/very short text → skip LLM
    normalized = (text or "").strip()
    if len(normalized) < 8:
        return 0.00

    base_url = os.getenv("PERPLEXITY_BASE_URL", "https://api.perplexity.ai")
    model    = os.getenv("PERPLEXITY_MODEL", "llama-3.1-sonar-small-128k-online")
    api_key  = os.getenv("PERPLEXITY_API_KEY")
    timeout  = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
    if not api_key:
        raise PerplexityConfigError("PERPLEXITY_API_KEY missing")

    user_prompt = (
        "Task: Given the INPUT text, score whether the author is planning an event AND likely to hire a photographer soon.\n"
        "Return ONLY a single number from 0.00 to 1.00 (two decimals). No extra text.\n\n"

        "How to reason (use semantics, not just exact words):\n"
        "- Consider synonyms, paraphrases, slang, emoji, hashtags, shorthand, and common misspellings.\n"
        "- Consider multilingual variants (e.g., Hinglish/Spanglish): treat “shaadi”, “engagement”, “function”, “shoot”,\n"
        "  “party”, “launch”, “pre-wedding”, “roka”, “mehendi”, etc. as event cues; treat camera/photography emoji (📸)\n"
        "  or booking phrases (“DM me”, “ping me”, “inbox”, “reach out”) as contact intent.\n"
        "- Recognize hiring vs. buying: ‘hiring a photographer (job posting)’ ≠ ‘hiring a photographer for my event (service purchase)’. "
        "  Staffing/agency/job-board listings are NOT buying intent.\n\n"

        "POSITIVE SIGNALS (boost):\n"
        "- Direct asks to procure services: looking for / need / recommend a photographer; inquiries about availability.\n"
        "- Event nouns & paraphrases: wedding/shaadi, engagement, party, function, conference, corporate, launch, product shoot, brand shoot, ceremony.\n"
        "- Timeframe cues: today, tomorrow, this/next week, this month, ASAP, urgent, soon, specific dates.\n"
        "- Purchase logistics: budget/rate/quote/price, location/venue/city, contact verbs (DM, email, call, book, schedule), collab invitations.\n"
        "- Emoji/hashtags implying shoots or bookings (e.g., 📸, #wedding, #event, #photoshoot).\n\n"

        "NEGATIVE SIGNALS (penalize or zero):\n"
        "- Employment/job posts for photographers (job boards, staffing agencies, HR pages, full-time roles, shifts, benefits).\n"
        "- Supplier/portfolio promos from photographers (my work/my rates/now booking/portfolio updates) without a buyer request.\n"
        "- Past event descriptions (‘yesterday’s shoot was great’), generic tips/news, unrelated hiring (engineers/designers).\n"
        "- Spammy/generic link dumps without any procurement intent.\n\n"

        "Edge handling:\n"
        "- If signals conflict, prefer the conservative estimate.\n"
        "- If truly unsure, output 0.40.\n\n"

        "Few-shot anchors:\n"
        "- “Any leads for a wedding photographer in Bandra this weekend? Budget 20–30k.” -> 0.90\n"
        "- “We’re hiring a full-time photographer for our studio (night shifts, benefits).” -> 0.05\n"
        "- “Posting my fashion portfolio; bookings open.” -> 0.15\n"
        "- “Need a product shoot ASAP in Andheri. DM rates.” -> 0.85\n"
        "- “Looking to collaborate with makeup artists & photographers for brand launch next month.” -> 0.75\n"
        "- “Photography tips for beginners.” -> 0.10\n\n"

        "INPUT:\n"
        f"{normalized}\n\n"

        "Output: a single number from 0.00 to 1.00 (two decimals)."
    )


    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a strict classifier for photographer-buying intent. Be concise and deterministic."},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.0,
        "top_p": 1.0,
        "max_tokens": 6  # keep tiny; we only need “0.00” style output
    }

    r = requests.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=timeout,
    )

    if r.status_code != 200:
        # Surface the model’s error message so you see exactly why it’s 400
        raise PerplexityHTTPError(f"HTTP {r.status_code} | model={model} | body={r.text[:400]}")

    content = r.json()["choices"][0]["message"]["content"].strip()
    m = re.search(r"\b([01](?:\.\d{1,2})?)\b", content)
    score = float(m.group(1)) if m else 0.5
    return max(0.0, min(1.0, round(score, 2)))

    return score
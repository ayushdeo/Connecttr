import os, requests
from dotenv import load_dotenv, find_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

from app.db import get_database

BASE_URL = os.getenv("PERPLEXITY_BASE_URL", "https://api.perplexity.ai")
MODEL    = os.getenv("PERPLEXITY_MODEL", "sonar")
API_KEY  = os.getenv("PERPLEXITY_API_KEY")
TIMEOUT  = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))

class WriterError(RuntimeError): ...

TONE_MAP = {
    "Founder": "direct and outcome-focused",
    "CEO": "strategic and high-level",
    "VP": "results-driven and efficient",
    "Manager": "collaborative and practical",
    "Coordinator": "supportive and informative"
}

CTA_MAP = {
    "Founder": "Quick 15-min strategy chat?",
    "CEO": "Open to a brief conversation?",
    "VP": "Open to a brief conversation?",
    "Manager": "Happy to share a short overview.",
    "default": "Worth a quick chat?"
}

SYSTEM_PROMPT = "You are an elite B2B cold email strategist. Output strict JSON. No markdown. No commentary."

def get_winning_patterns(org_id: str, campaign_id: str) -> str:
    """
    Phase 2: Success-Aware Writing.
    Extract structural patterns from top-performing templates.
    """
    db = get_database()
    col = db["template_performance"]
    # Get top 3 by conversion_rate
    best = list(col.find({"org_id": org_id}).sort("conversion_rate", -1).limit(3))
    
    if not best:
        return "- Conciseness\n- Direct value prop\n- Clear CTA"
    
    patterns = []
    for t in best:
        patterns.append(f"- {t.get('structural_feature', 'Short subject lines')}")
    return "\n".join(set(patterns))

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def generate_email_templates(campaign_context: dict, lead: dict, signal: str = "") -> dict:
    if not API_KEY:
        raise WriterError("PERPLEXITY_API_KEY missing")
        
    org_id = lead.get("org_id", "default")
    campaign_id = campaign_context.get("id", "default")
    role = lead.get("role", "")
    
    tone_style = TONE_MAP.get(role, "professional")
    cta = CTA_MAP.get(role, CTA_MAP["default"])
    winning_patterns = get_winning_patterns(org_id, campaign_id)
    
    user_prompt = f"""
Task: Generate 3 cold email options.
Tone: {tone_style}

CONTEXT:
- ICP: {campaign_context.get('icp_summary', 'N/A')}
- Value Prop/Services: {campaign_context.get('services', 'N/A')}

LEAD:
- Role: {role}
- Company: {lead.get('company', 'N/A')}
- Signal: {signal}

SUCCESSFUL PATTERNS TO BIAS:
{winning_patterns}

SUGGESTED CTA:
{cta}

Output strict JSON:
{{
  "option_a": {{ "subject": "...", "body": "...", "structural_feature": "short subject" }},
  "option_b": {{ "subject": "...", "body": "...", "structural_feature": "question opening" }},
  "option_c": {{ "subject": "...", "body": "...", "structural_feature": "social proof" }}
}}

Rules:
- Body: 100-130 words.
- Professional, concise.
"""

    payload = {
        "model": MODEL, 
        "temperature": 0.2, 
        "max_tokens": 800,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
    }
    
    r = requests.post(f"{BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type":"application/json"},
        json=payload, timeout=TIMEOUT)
        
    if r.status_code != 200:
        raise WriterError(f"HTTP {r.status_code}: {r.text[:300]}")
        
    import re, json
    text = r.json()["choices"][0]["message"]["content"].strip()
    m = re.search(r"\{.*\}", text, flags=re.S)
    if not m:
        return {"A":{}, "B":{}, "C":{}}
        
    try:
        data = json.loads(m.group(0))
        # Add metadata about CTA and structural features for performance tracking
        for k in ["option_a", "option_b", "option_c"]:
            if k in data:
                data[k]["cta"] = cta
                
        return {
            "A": data.get("option_a", {}),
            "B": data.get("option_b", {}),
            "C": data.get("option_c", {})
        }
    except Exception:
        return {"A":{}, "B":{}, "C":{}}

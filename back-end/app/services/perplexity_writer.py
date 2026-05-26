# app/services/perplexity_writer.py
# Cold email generator — now powered by Gemini via the shared llm_client.
from app.services.llm_client import call_llm, extract_json
from app.db import get_database

TONE_MAP = {
    "Founder": "direct and outcome-focused",
    "Co-Founder": "direct and outcome-focused",
    "CEO": "strategic and high-level",
    "VP": "results-driven and efficient",
    "Manager": "collaborative and practical",
    "Coordinator": "supportive and informative",
    "Freelancer": "peer-to-peer and genuine",
    "Creative": "conversational and respectful of their craft",
}

CTA_MAP = {
    "Founder": "Quick 15-min strategy chat?",
    "Co-Founder": "Quick 15-min strategy chat?",
    "CEO": "Open to a brief conversation?",
    "VP": "Open to a brief conversation?",
    "Freelancer": "Happy to share how we work?",
    "Creative": "Worth a quick chat about your work?",
    "default": "Worth a quick chat?",
}

SYSTEM_PROMPT = "You are an elite B2B cold email strategist. Output strict JSON. No markdown. No commentary."


class WriterError(RuntimeError): ...


def get_winning_patterns(org_id: str, campaign_id: str) -> str:
    db = get_database()
    col = db["template_performance"]
    best = list(col.find({"org_id": org_id}).sort("conversion_rate", -1).limit(3))
    if not best:
        return "- Conciseness\n- Direct value prop\n- Clear CTA"
    patterns = [f"- {t.get('structural_feature', 'Short subject lines')}" for t in best]
    return "\n".join(set(patterns))


def generate_email_templates(campaign_context: dict, lead: dict, signal: str = "") -> dict:
    org_id = lead.get("org_id", "default")
    campaign_id = campaign_context.get("id", "default")
    role = lead.get("role", "")

    tone_style = TONE_MAP.get(role, "professional and respectful")
    cta = CTA_MAP.get(role, CTA_MAP["default"])
    winning_patterns = get_winning_patterns(org_id, campaign_id)

    user = f"""Generate 3 cold email options.
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

SUGGESTED CTA: {cta}

Output ONLY this JSON:
{{
  "option_a": {{"subject": "...", "body": "...", "structural_feature": "short subject"}},
  "option_b": {{"subject": "...", "body": "...", "structural_feature": "question opening"}},
  "option_c": {{"subject": "...", "body": "...", "structural_feature": "social proof"}}
}}

Rules: body 100-130 words, professional, concise."""

    try:
        content = call_llm(SYSTEM_PROMPT, user, max_tokens=800, temperature=0.2)
        data = extract_json(content)
        if not data:
            return {"A": {}, "B": {}, "C": {}}
        for k in ["option_a", "option_b", "option_c"]:
            if k in data:
                data[k]["cta"] = cta
        return {
            "A": data.get("option_a", {}),
            "B": data.get("option_b", {}),
            "C": data.get("option_c", {}),
        }
    except Exception:
        return {"A": {}, "B": {}, "C": {}}

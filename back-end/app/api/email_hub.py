from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from pathlib import Path
import json, time, uuid

from app.services.perplexity_writer import generate_email_templates
from app.services.postmark_client import send_postmark_email

router = APIRouter(prefix="/emailhub", tags=["emailhub"])

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"; DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "email_db.json"

def _load_db():
    if DB_PATH.exists():
        return json.loads(DB_PATH.read_text(encoding="utf-8"))
    return {"leads": [], "messages": []}  # messages threaded by lead_id

def _save_db(db):
    DB_PATH.write_text(json.dumps(db, indent=2, ensure_ascii=False), encoding="utf-8")

# ---- models
class Lead(BaseModel):
    id: str
    campaign_id: str
    name: str
    company: str | None = None
    role: str | None = None
    email: str | None = None     # <-- was EmailStr (required)
    score: int = 0
    status: str = "New"

class TemplateReq(BaseModel):
    lead_id: str
    campaign_id: str
    company_brief: str = ""
    signal: str = ""

class SendReq(BaseModel):
    lead_id: str
    campaign_id: str
    from_email: EmailStr
    choice: str  # "A" | "B" | "C"
    draft: dict   # {subject, body}

# ---- leads
@router.get("/leads")
def list_leads():
    return _load_db()["leads"]

@router.post("/leads/import")
def import_leads(items: list[Lead]):
    db = _load_db()
    # upsert by id/email
    existing = {(l["id"], l["email"]) for l in db["leads"]}
    for l in items:
        key = (l.id, l.email)
        if key not in existing:
            db["leads"].append(l.dict())
    _save_db(db)
    return {"count": len(items)}

# ---- templates (LLM)
@router.post("/templates")
def make_templates(body: TemplateReq):
    db = _load_db()
    leads = {l["id"]: l for l in db["leads"]}
    lead = leads.get(body.lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    tpl = generate_email_templates(body.company_brief, lead, body.signal)
    return {"lead": lead, "templates": tpl}

# ---- send via Postmark
@router.post("/send")
def send_email(body: SendReq):
    db = _load_db()
    leads = {l["id"]: l for l in db["leads"]}
    lead = leads.get(body.lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")

    resp = send_postmark_email(
        campaign_id=body.campaign_id, lead_id=body.lead_id,
        to_email=lead["email"], from_email=body.from_email,
        subject=body.draft.get("subject","(no subject)"),
        text_body=body.draft.get("body","")
    )
    # persist message
    msg = {
        "id": uuid.uuid4().hex, "lead_id": body.lead_id, "campaign_id": body.campaign_id,
        "direction": "outbound", "provider": "postmark",
        "provider_msg_id": resp.get("MessageID"), "subject": body.draft.get("subject",""),
        "text": body.draft.get("body",""), "created_at": time.time(), "events": []
    }
    db["messages"].append(msg)
    # update lead status
    for l in db["leads"]:
        if l["id"] == body.lead_id:
            l["status"] = "Sent"
            break
    _save_db(db)
    return {"ok": True, "message": msg}

# ---- thread
@router.get("/threads/{lead_id}")
def thread(lead_id: str):
    db = _load_db()
    msgs = [m for m in db["messages"] if m.get("lead_id") == lead_id]
    return {"messages": sorted(msgs, key=lambda m: m["created_at"])}

# ---- webhooks (Postmark)
@router.post("/webhooks/postmark/inbound")
async def postmark_inbound(payload: dict):
    """Configure Postmark Inbound to POST here."""
    # MailboxHash will be "<campaignId>.<leadId>" from Reply-To r+<cid>.<lid>@...
    mailbox_hash = payload.get("MailboxHash") or ""
    cid, lid = (mailbox_hash.split(".", 1) + [None])[:2]
    text = payload.get("TextBody") or ""
    subj = payload.get("Subject") or ""

    db = _load_db()
    msg = {
        "id": uuid.uuid4().hex, "lead_id": lid, "campaign_id": cid,
        "direction": "inbound", "provider": "postmark",
        "provider_msg_id": payload.get("MessageID"),
        "subject": subj, "text": text, "created_at": time.time(),
        "events": [{"type":"reply_inbound","payload":payload}]
    }
    db["messages"].append(msg)
    # mark lead responded
    for l in db["leads"]:
        if l["id"] == lid:
            l["status"] = "Responded"
            break
    _save_db(db)
    return {"ok": True}

@router.post("/webhooks/postmark/events")
async def postmark_events(request: Request):
    data = await request.json()
    items = data if isinstance(data, list) else [data]
    db = _load_db()
    for ev in items:
        msg_id = ev.get("MessageID")
        etype = ev.get("RecordType")  # Delivery, Open, Click, Bounce...
        for m in db["messages"]:
            if m.get("provider_msg_id") == msg_id:
                m.setdefault("events", []).append({"type": etype, "payload": ev, "t": time.time()})
                # lightweight status sync
                if etype == "Open":
                    _lead = next((l for l in db["leads"] if l["id"] == m["lead_id"]), None)
                    if _lead and _lead["status"] == "Sent":
                        _lead["status"] = "Opened"
                if etype == "Bounce":
                    _lead = next((l for l in db["leads"] if l["id"] == m["lead_id"]), None)
                    if _lead:
                        _lead["status"] = "Bounced"
                break
    _save_db(db)
    return {"ok": True, "count": len(items)}
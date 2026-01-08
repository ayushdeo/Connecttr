from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
import time, uuid, os
from typing import List, Optional

from app.services.perplexity_writer import generate_email_templates
from app.services.postmark_client import send_postmark_email
from app.db import get_leads_collection, get_emails_collection

router = APIRouter(prefix="/emailhub", tags=["emailhub"])

# ---- models
class Lead(BaseModel):
    id: str
    campaign_id: str
    name: str
    company: str | None = None
    role: str | None = None
    email: str | None = None
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
    # Return all leads from MongoDB that have been imported (or all of them?)
    # The original logic segregated leads in email_db.json. 
    # Now valid leads are in the 'leads' collection.
    # We might want to filter only those that have 'email' and are 'event_buyer_candidate'?
    # Or just return all 'leads' in the DB.
    # For now, let's return all.
    collection = get_leads_collection()
    leads = []
    for doc in collection.find():
        doc["id"] = str(doc.get("id") or doc.get("_id"))
        if "_id" in doc: del doc["_id"]
        leads.append(doc)
    return leads

from app.services.email_service import upsert_leads_to_hub

@router.post("/leads/import")
def import_leads(items: List[Lead]):
    # Convert Pydantic models to dicts
    data = [l.dict() for l in items]
    count = upsert_leads_to_hub(data)
    return {"count": count, "message": "Imported successfully"}

# ---- templates (LLM)
@router.post("/templates")
def make_templates(body: TemplateReq):
    collection = get_leads_collection()
    # match by 'id' field (string) or '_id'
    lead = collection.find_one({"id": body.lead_id})
    if not lead:
        # try _id?
        try:
            from bson.objectid import ObjectId
            lead = collection.find_one({"_id": ObjectId(body.lead_id)})
        except:
             pass

    if not lead:
        raise HTTPException(404, "Lead not found")
        
    # sanitize for JSON return
    lead_out = dict(lead)
    if "_id" in lead_out: lead_out["id"] = str(lead_out["_id"]); del lead_out["_id"]

    tpl = generate_email_templates(body.company_brief, lead_out, body.signal)
    return {"lead": lead_out, "templates": tpl}

# ---- send via Postmark
@router.post("/send")
def send_email(body: SendReq):
    leads_col = get_leads_collection()
    emails_col = get_emails_collection()

    lead = leads_col.find_one({"id": body.lead_id})
    if not lead:
         # fallback try _id objectid
         try:
            from bson import ObjectId
            lead = leads_col.find_one({"_id": ObjectId(body.lead_id)})
         except:
            pass
    
    if not lead:
        raise HTTPException(404, "Lead not found")

    resp = send_postmark_email(
        campaign_id=body.campaign_id, lead_id=body.lead_id,
        to_email=lead.get("email"), from_email=body.from_email,
        subject=body.draft.get("subject","(no subject)"),
        text_body=body.draft.get("body","")
    )
    
    # persist message
    msg = {
        "id": uuid.uuid4().hex, 
        "lead_id": body.lead_id, 
        "campaign_id": body.campaign_id,
        "direction": "outbound", 
        "provider": "postmark",
        "provider_msg_id": resp.get("MessageID"), 
        "subject": body.draft.get("subject",""),
        "text": body.draft.get("body",""), 
        "created_at": time.time(), 
        "events": []
    }
    emails_col.insert_one(msg)
    
    # update lead status
    leads_col.update_one(
        {"_id": lead["_id"]},
        {"$set": {"status": "Sent"}}
    )

    msg_out = dict(msg)
    if "_id" in msg_out: del msg_out["_id"]
    return {"ok": True, "message": msg_out}

# ---- thread
@router.get("/threads/{lead_id}")
def thread(lead_id: str):
    emails_col = get_emails_collection()
    cursor = emails_col.find({"lead_id": lead_id}).sort("created_at", 1)
    msgs = []
    for m in cursor:
        m["id"] = str(m.get("id") or m.get("_id"))
        if "_id" in m: del m["_id"]
        msgs.append(m)
    return {"messages": msgs}

# ---- webhooks (Postmark)
@router.post("/webhooks/postmark/inbound")
async def postmark_inbound(payload: dict):
    """Configure Postmark Inbound to POST here."""
    # MailboxHash will be "<campaignId>.<leadId>" from Reply-To r+<cid>.<lid>@...
    mailbox_hash = payload.get("MailboxHash") or ""
    parts = mailbox_hash.split(".", 1)
    cid = parts[0] if len(parts) > 0 else None
    lid = parts[1] if len(parts) > 1 else None

    text = payload.get("TextBody") or ""
    subj = payload.get("Subject") or ""

    if not lid:
        print("[Webhook] No lead ID found in MailboxHash")
        # Proceed anyway? store with null lead?
    
    emails_col = get_emails_collection()
    leads_col = get_leads_collection()

    msg = {
        "id": uuid.uuid4().hex, 
        "lead_id": lid, 
        "campaign_id": cid,
        "direction": "inbound", 
        "provider": "postmark",
        "provider_msg_id": payload.get("MessageID"),
        "subject": subj, 
        "text": text, 
        "created_at": time.time(),
        "events": [{"type":"reply_inbound","payload":payload}]
    }
    emails_col.insert_one(msg)
    
    # mark lead responded
    if lid:
        leads_col.update_one(
            {"id": lid}, # assume string id
            {"$set": {"status": "Responded"}}
        )
        # also try _id just in case
        try:
             from bson import ObjectId
             leads_col.update_one({"_id": ObjectId(lid)}, {"$set": {"status": "Responded"}})
        except:
             pass

    return {"ok": True}

@router.post("/webhooks/postmark/events")
async def postmark_events(request: Request):
    data = await request.json()
    items = data if isinstance(data, list) else [data]
    
    emails_col = get_emails_collection()
    leads_col = get_leads_collection()
    
    count = 0
    for ev in items:
        msg_id = ev.get("MessageID")
        etype = ev.get("RecordType")  # Delivery, Open, Click, Bounce...
        
        # update message events
        # We need to find the message by provider_msg_id
        msg = emails_col.find_one({"provider_msg_id": msg_id})
        
        if msg:
            event_entry = {"type": etype, "payload": ev, "t": time.time()}
            emails_col.update_one(
                {"_id": msg["_id"]},
                {"$push": {"events": event_entry}}
            )
            
            # lightweight status sync
            lid = msg.get("lead_id")
            if lid:
                if etype == "Open":
                    # only update if current status is Sent (don't overwrite 'Responded')
                    leads_col.update_one(
                        {"id": lid, "status": "Sent"},
                        {"$set": {"status": "Opened"}}
                    )
                if etype == "Bounce":
                     leads_col.update_one(
                        {"id": lid},
                        {"$set": {"status": "Bounced"}}
                    )
            count += 1
            
    return {"ok": True, "count": count}
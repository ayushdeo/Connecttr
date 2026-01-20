from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel, EmailStr
import time, uuid, os, json
from typing import List, Optional, Dict, Any

from app.services.perplexity_writer import generate_email_templates
from app.services.postmark_client import send_postmark_email
from app.db import get_leads_collection, get_emails_collection

router = APIRouter(prefix="/emailhub", tags=["emailhub"])
from app.services.postmark_client import PostmarkError
import logging
log = logging.getLogger("uvicorn")

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
        
    # [Start of Change: Sequence Gating]
    # Enforce global stop and sequence stop rules
    if lead.get("do_not_contact"):
         raise HTTPException(400, "Lead is marked as Do Not Contact (Spam Complaint)")
    
    if not lead.get("sequence_active", True):
         raise HTTPException(400, "Lead sequence is stopped")
    # [End of Change]

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
@router.get("/webhooks/postmark/inbound")
def postmark_inbound_check():
    """
    Simple check endpoint for Postmark UI.
    """
    return {"ok": True, "message": "Inbound webhook ready"}

@router.post("/webhooks/postmark/inbound", dependencies=[])
def postmark_inbound(payload: Dict[str, Any] = Body(default={})):
    """
    Handle inbound replies from Postmark.
    Stops sequence and marks lead as Responded.
    [SYNC] Uses threadpool to avoid blocking event loop with PyMongo.
    """
    # NO Signature Verification required for Postmark Inbound
    # Payload is automatically parsed by FastAPI/Pydantic from JSON body
    
    # 2. Parse Metadata
    # MailboxHash will be "<campaignId>.<leadId>" from Reply-To r+<cid>.<lid>@...
    mailbox_hash = payload.get("MailboxHash") or ""
    parts = mailbox_hash.split(".", 1)
    
    cid = parts[0] if len(parts) > 0 else None
    lid = parts[1] if len(parts) > 1 else None

    text = payload.get("TextBody") or ""
    subj = payload.get("Subject") or ""
    msg_id = payload.get("MessageID")

    if not lid:
        log.error(f"[Webhook] No lead ID found in MailboxHash: {mailbox_hash}")
        # We store it for manual review, but can't link effectively
        # return 200 to avoid retries
        return {"ok": True, "status": "orphaned"}
    
    # 3. Store Message
    emails_col = get_emails_collection()
    leads_col = get_leads_collection()
    
    try:
        msg = {
            "id": uuid.uuid4().hex, 
            "lead_id": lid, 
            "campaign_id": cid,
            "direction": "inbound", 
            "provider": "postmark",
            "provider_msg_id": msg_id,
            "subject": subj, 
            "text": text, 
            "created_at": time.time(),
            "events": [{"type":"reply_inbound", "payload": payload}]
        }
        # Short timeout to prevent blocking
        emails_col.insert_one(msg)
        
        # 4. Update Lead State (STOP SEQUENCE)
        # Try finding lead by ID string or ObjectId
        filter_q = {"id": lid}
        if leads_col.find_one(filter_q, max_time_ms=200) is None:
            try:
                from bson import ObjectId
                filter_q = {"_id": ObjectId(lid)}
            except:
                pass # stick with string id
                
        leads_col.update_one(
            filter_q,
            {
                "$set": {
                    "status": "Responded",
                    "sequence_active": False,
                    "sequence_reason_stopped": "replied"
                }
            }
        )
    except Exception as e:
        log.error(f"DB Error in Inbound Webhook: {e}")
        # Always return OK to keep Postmark happy
        pass

    return {"ok": True}

@router.get("/webhooks/postmark/events")
def postmark_events_check():
    """
    Simple check endpoint for Postmark UI.
    """
    return {"ok": True, "message": "Events webhook ready"}

@router.post("/webhooks/postmark/events", dependencies=[])
def postmark_events(data: Dict[str, Any] | List[Dict[str, Any]] = Body(default={})):
    """
    Handle delivery/open/click/bounce/spam events.
    [SYNC] Uses threadpool to avoid blocking event loop with PyMongo.
    """
    # NO Signature Verification required for Postmark Events
    # Data is parsed automatically (can be dict or list of dicts)
    items = data if isinstance(data, list) else [data]
    
    emails_col = get_emails_collection()
    leads_col = get_leads_collection()
    
    count = 0
    try:
        for ev in items:
            msg_id = ev.get("MessageID")
            etype = ev.get("RecordType")  # Delivery, Open, Click, Bounce, SpamComplaint
            
            # update message events
            msg = emails_col.find_one({"provider_msg_id": msg_id}, max_time_ms=200)
            lid = None
            
            if msg:
                lid = msg.get("lead_id")
                event_entry = {"type": etype, "payload": ev, "t": time.time()}
                emails_col.update_one(
                    {"_id": msg["_id"]},
                    {"$push": {"events": event_entry}}
                )
            else:
                pass
    
            if not lid:
                continue
    
            # 2. Handle State Transitions
            # Find lead (support ObjectId fallback)
            filter_q = {"id": lid}
            lead = leads_col.find_one(filter_q, max_time_ms=200)
            if not lead:
                 try:
                     from bson import ObjectId
                     filter_q = {"_id": ObjectId(lid)}
                     lead = leads_col.find_one(filter_q, max_time_ms=200)
                 except:
                     pass
            
            if not lead:
                continue
                
            current_status = lead.get("status")
    
            updates = {}
            
            if etype == "Open" or etype == "Click":
                # Only mark Opened if not already Responded
                if current_status not in ["Responded", "Bounced", "SpamComplaint"]:
                    updates["status"] = "Opened"
            
            elif etype == "Bounce":
                # HARD STOP
                updates["status"] = "Bounced"
                updates["sequence_active"] = False
                updates["sequence_reason_stopped"] = "bounced"
                
            elif etype == "SpamComplaint":
                # HARD STOP + DO NOT CONTACT
                updates["status"] = "SpamComplaint"
                updates["sequence_active"] = False
                updates["sequence_reason_stopped"] = "spam_complaint"
                updates["do_not_contact"] = True
                
            if updates:
                leads_col.update_one(filter_q, {"$set": updates})
                
            count += 1
    except Exception as e:
        log.error(f"DB Error in Events Webhook: {e}")
        # Return OK so Postmark doesn't retry endlessly specific malformed events
        pass
            
    return {"ok": True, "count": count}
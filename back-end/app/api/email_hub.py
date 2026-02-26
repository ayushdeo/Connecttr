from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel, EmailStr
import time, uuid, os, json
from typing import List, Optional, Dict, Any

from app.services.perplexity_writer import generate_email_templates
from app.services.postmark_client import send_postmark_email, PostmarkError
from app.services.reply_classifier import classify_reply
from app.services.email_service import check_send_limits, upsert_leads_to_hub, is_domain_blacklisted, process_bounce
from app.db import get_leads_collection, get_emails_collection

router = APIRouter(prefix="/emailhub", tags=["emailhub"])

import logging
log = logging.getLogger("uvicorn")

from fastapi import Depends
from app.core.deps import get_current_user_with_org
from app.models.user_model import UserInDB

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
    to_email: Optional[EmailStr] = None  # Added for manual sends
    choice: str  # "A" | "B" | "C"
    draft: dict   # {subject, body}

# ---- leads
@router.get("/leads")
def list_leads(current_user: UserInDB = Depends(get_current_user_with_org)):
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
def import_leads(items: List[Lead], current_user: UserInDB = Depends(get_current_user_with_org)):
    # Convert Pydantic models to dicts
    data = [l.dict() for l in items]
    count = upsert_leads_to_hub(data)
    return {"count": count, "message": "Imported successfully"}

# ---- templates (LLM)
@router.post("/templates")
def make_templates(body: TemplateReq, current_user: UserInDB = Depends(get_current_user_with_org)):
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

    # Fetch actual campaign context
    campaigns = get_database()["campaigns"]
    camp = campaigns.find_one({"id": body.campaign_id})
    real_brief = camp.get("brief", {}) if camp else {}
    real_brief["id"] = body.campaign_id

    tpl = generate_email_templates(real_brief, lead_out, body.signal)
    return {"lead": lead_out, "templates": tpl}

# ---- send via Postmark
from app.core.limiter import limiter
from app.db import get_database
import random
from datetime import datetime

from app.services.campaign_health import check_campaign_health
from app.services.experiments import thompson_select

def select_template_variant(org_id: str, campaign_id: str) -> str:
    """
    Phase 3: Experimentation Mode Toggle
    """
    db = get_database()
    col = db["template_performance"]
    mode = os.getenv("EXPERIMENT_MODE", "production")
    
    if mode == "research":
        variants = list(col.find({"org_id": org_id, "campaign_id": campaign_id}))
        if not variants:
            return random.choice(["A", "B", "C"])
        return thompson_select(variants)
        
    # Standard Production Logic: Batch Bayesian (95/5 Biased Exploitation)
    promoted = col.find_one({"org_id": org_id, "campaign_id": campaign_id, "is_promoted": True})
    if promoted:
        if random.random() < 0.95:
            return promoted["template_variant"]
            
    best = col.find_one({"org_id": org_id, "campaign_id": campaign_id}, sort=[("conversion_rate", -1)])
    if not best or random.random() < 0.20:
        return random.choice(["A", "B", "C"])
    return best.get("template_variant", "A")

@router.post("/send")
@limiter.limit("20/hour")
def send_email(request: Request, body: SendReq, current_user: UserInDB = Depends(get_current_user_with_org)):
    leads_col = get_leads_collection()
    emails_col = get_emails_collection()
    db = get_database()
    
    # PHASE 3: Health Check
    health = check_campaign_health(body.campaign_id)
    if health.get("status") == "paused":
         raise HTTPException(400, f"Campaign is paused: {health.get('reason')}")

    # ABUSE PROTECTION: Daily Cap
    check_send_limits(current_user.id, current_user.org_id, limit=50)

    # Resolve Lead
    lead = None
    if body.campaign_id == "default":
        if not body.to_email: raise HTTPException(400, "to_email is required for manual sends")
        existing = leads_col.find_one({"email": body.to_email})
        if existing:
            lead = existing
            if "_id" in lead: lead["id"] = str(lead.get("id") or lead.get("_id"))
        else:
            new_id = body.lead_id if body.lead_id else uuid.uuid4().hex
            lead = {
                "id": new_id,
                "email": body.to_email,
                "name": body.to_email.split("@")[0],
                "status": "New",
                "org_id": current_user.org_id,
                "campaign_id": "default",
                "created_at": time.time()
            }
            leads_col.insert_one(lead)
    else:
        lead = leads_col.find_one({"id": body.lead_id})
        if not lead:
             try:
                from bson import ObjectId
                lead = leads_col.find_one({"_id": ObjectId(body.lead_id)})
             except: pass
        if not lead: raise HTTPException(404, "Lead not found")
        if lead.get("do_not_contact"): raise HTTPException(400, "Lead is marked as Do Not Contact")
        if not lead.get("sequence_active", True): raise HTTPException(400, "Lead sequence is stopped")

    # Resolve Variant & Rotation
    final_choice = body.choice
    if final_choice == "Auto":
        final_choice = select_template_variant(current_user.org_id, body.campaign_id)

    recipient = body.to_email or lead.get("email")
    if not recipient: raise HTTPException(400, "Lead has no email address")

    if is_domain_blacklisted(recipient, current_user.org_id):
        raise HTTPException(400, f"Domain blacklisted: {recipient.split('@')[-1]}")

    resp = send_postmark_email(
        campaign_id=body.campaign_id,
        lead_id=str(lead.get("id") or lead.get("_id") or ""),
        to_email=recipient, 
        from_email=body.from_email,
        subject=body.draft.get("subject","(no subject)"),
        text_body=body.draft.get("body","")
    )
    
    # persist message with performance metadata
    msg = {
        "id": uuid.uuid4().hex, 
        "lead_id": str(lead.get("id") or lead.get("_id") or ""), 
        "campaign_id": body.campaign_id,
        "direction": "outbound", 
        "provider": "postmark",
        "provider_msg_id": resp.get("MessageID"), 
        "subject": body.draft.get("subject",""),
        "text": body.draft.get("body",""), 
        "sent_variant": final_choice, # A | B | C
        "structural_feature": body.draft.get("structural_feature"),
        "created_at": time.time(), 
        "events": []
    }
    emails_col.insert_one(msg)
    
    # 4D. Update Lead with variant info for webhook tracking
    filter_q = {"_id": lead["_id"]} if "_id" in lead else {"id": lead["id"]}
    leads_col.update_one(
        filter_q,
        {"$set": {"status": "Sent", "sent_variant": final_choice}}
    )

    # 4E. Record Template Send to Performance Collection
    db["template_performance"].update_one(
        {"org_id": current_user.org_id, "campaign_id": body.campaign_id, "template_variant": final_choice},
        {"$inc": {"sent": 1}, "$set": {"last_updated": datetime.utcnow()}},
        upsert=True
    )

    msg_out = dict(msg)
    if "_id" in msg_out: del msg_out["_id"]
    return {"ok": True, "message": msg_out, "chosen_variant": final_choice}

# ---- thread
@router.get("/threads/{lead_id}")
def thread(lead_id: str, current_user: UserInDB = Depends(get_current_user_with_org)):
    emails_col = get_emails_collection()
    cursor = emails_col.find({"lead_id": lead_id}).sort("created_at", 1)
    msgs = []
    for m in cursor:
        m["id"] = str(m.get("id") or m.get("_id"))
        if "_id" in m: del m["_id"]
        msgs.append(m)
    return {"messages": msgs}

class ClassifyReq(BaseModel):
    message_id: str

@router.post("/classify-reply")
def classify_message_reply(body: ClassifyReq, current_user: UserInDB = Depends(get_current_user_with_org)):
    """
    Manually trigger AI classification for a specific inbound message.
    """
    emails_col = get_emails_collection()
    
    # Find the message
    msg = emails_col.find_one({"id": body.message_id})
    if not msg:
        raise HTTPException(404, "Message not found")
        
    if msg.get("direction") != "inbound":
        raise HTTPException(400, "Can only classify inbound replies")
        
    # Find the original outbound email to get context
    lead_id = msg.get("lead_id")
    # Simplest: find the last outbound email to this lead before this message
    original = emails_col.find_one({
        "lead_id": lead_id,
        "direction": "outbound",
        "created_at": {"$lt": msg.get("created_at")}
    }, sort=[("created_at", -1)])
    
    orig_body = original.get("text", "") if original else "(No original email found)"
    reply_body = msg.get("text", "")
    
    res = classify_reply(orig_body, reply_body)
    
    # Store result
    emails_col.update_one(
        {"_id": msg["_id"]},
        {"$set": {"classification": res}}
    )
    
    return res

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
        # Find original message for classification context
        # We try to find the last outbound message for this lead ID
        orig_body = ""
        try:
             # This is slightly risky if lid is malformed but we have a try/except
             last_out = emails_col.find_one({
                 "lead_id": lid,
                 "direction": "outbound"
             }, sort=[("created_at", -1)])
             if last_out:
                 orig_body = last_out.get("text", "")
        except:
             pass

        # Call AI Classifier
        classification = classify_reply(orig_body, text)

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
            "classification": classification,
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
            
            # 3. EXTRA: Process Bounce Feedback Loop
            if etype == "Bounce":
                # Need org_id and email
                email = lead.get("email")
                org_id = lead.get("org_id")
                if email and org_id:
                    process_bounce(lead.get("campaign_id"), email, org_id)
                
            count += 1
    except Exception as e:
        log.error(f"DB Error in Events Webhook: {e}")
        # Return OK so Postmark doesn't retry endlessly specific malformed events
        pass
            
    return {"ok": True, "count": count}
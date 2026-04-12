from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from datetime import datetime, timedelta
import secrets, os, time
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

from app.db import (
    get_users_collection, get_orgs_collection, get_invites_collection,
    get_alerts_collection, get_audit_collection, get_database
)
from app.core.deps import get_current_user_with_org, RoleChecker
from app.models.user_model import UserInDB
from app.models.invite_model import OrgInvite
from app.services.postmark_client import send_postmark_email 
from app.core.limiter import limiter
from fastapi import Request

# Note: postmark_client currently targets leads, might need a generic email sender.
# For now, we'll assume we can use it or extend it.

router = APIRouter(prefix="/orgs", tags=["orgs"])

# --- Members ---

@router.get("/members")
def list_members(
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner", "admin"]))
):
    users_coll = get_users_collection()
    members = []
    for u in users_coll.find({"org_id": current_user.org_id}):
        u["id"] = str(u["_id"])
        del u["_id"]
        # Scrub sensitive fields if any? (e.g. provider_id maybe)
        members.append(u)
    return members

@router.patch("/members/{user_id}")
def update_member_role(
    user_id: str, 
    role: str = Body(..., embed=True),
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner"]))
):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot change your own role")
    
    users_coll = get_users_collection()
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(400, "Invalid ID format")

    member = users_coll.find_one({"_id": oid, "org_id": current_user.org_id})
    if not member:
        raise HTTPException(404, "Member not found")
        
    # Handle ownership transfer
    if role == "owner":
        orgs_coll = get_orgs_collection()
        # Update organization owner
        orgs_coll.update_one(
            {"_id": ObjectId(current_user.org_id)}, 
            {"$set": {"owner_id": user_id}}
        )
        # Demote current owner to admin
        users_coll.update_one(
            {"_id": ObjectId(current_user.id)}, 
            {"$set": {"role": "admin"}}
        )
        # Audit Log for transfer
        get_audit_collection().insert_one({
            "org_id": current_user.org_id,
            "user_id": current_user.id,
            "action": "ownership_transferred",
            "resource": "org",
            "metadata": {"new_owner_id": user_id},
            "timestamp": datetime.utcnow()
        })

    users_coll.update_one({"_id": oid}, {"$set": {"role": role}})
    return {"ok": True}

@router.delete("/members/{user_id}")
def remove_member(
    user_id: str,
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner", "admin"]))
):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot remove yourself")
        
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(400, "Invalid ID format")
        
    users_coll = get_users_collection()
    member = users_coll.find_one({"_id": oid, "org_id": current_user.org_id})
    if not member:
        raise HTTPException(404, "Member not found")
        
    # Check if target is owner?
    if member.get("role") == "owner" and current_user.role != "owner":
        raise HTTPException(403, "Cannot remove an owner")

    # Soft delete or hard delete or just unassign org?
    # Unassign org -> user becomes orphaned.
    users_coll.update_one({"_id": oid}, {"$unset": {"org_id": "", "role": ""}, "$set": {"is_active": False}})
    return {"ok": True}

# --- Invites ---

@router.post("/invites")
@limiter.limit("5/minute")
def create_invite(
    request: Request,
    email: str = Body(..., embed=True),
    role: str = Body("member", embed=True),
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner", "admin"]))
):
    # Check existing user
    users_coll = get_users_collection()
    if users_coll.find_one({"email": email}):
        # For simplicity: Reject existing users.
        raise HTTPException(400, "User already registered. They must leave their current organization first.")
        
    invites_coll = get_invites_collection()
    # Check pending invite
    existing = invites_coll.find_one({"email": email, "org_id": current_user.org_id, "status": "pending"})
    if existing:
        return {"ok": True, "message": "Invite already pending", "token": existing["token"]} 

    token = secrets.token_urlsafe(32)
    invite = OrgInvite(
        org_id=current_user.org_id,
        email=email,
        role=role,
        token=token,
        expires_at=datetime.utcnow() + timedelta(days=7),
        invited_by_user_id=current_user.id
    )
    
    invites_coll.insert_one(invite.dict(exclude={"id"}))
    
    # Send Email
    invite_link = f"{os.getenv('FRONTEND_ORIGIN')}/login?invite={token}"
    
    email_sent = False
    for attempt in range(3):
        try:
            send_postmark_email(
                campaign_id="system-invite",
                lead_id="system",
                to_email=email,
                from_email=os.getenv("POSTMARK_FROM_EMAIL", "support@connecttr.com"),
                subject="You've been invited to Connecttr",
                text_body=f"You have been invited to join an organization on Connecttr.\n\nClick here to accept: {invite_link}\n\nThis link expires in 7 days.",
                html_body=f"<p>You have been invited to join an organization on Connecttr.</p><p><a href='{invite_link}'>Accept Invite</a></p><p>This link expires in 7 days.</p>"
            )
            email_sent = True
            break
        except Exception as e:
            logger.error(f"Invite email failed on attempt {attempt+1}", exc_info=True)
            time.sleep(2 ** attempt)
            
    if not email_sent:
        logger.error("All email retries failed. Returning token for manual share.", extra={"email": email})
        
    # Audit Log
    get_audit_collection().insert_one({
        "org_id": current_user.org_id,
        "user_id": current_user.id,
        "action": "invite_created",
        "resource": "org",
        "metadata": {"email": email, "role": role},
        "timestamp": datetime.utcnow()
    })
    logger.info("Invite created", extra={"email": email, "role": role, "org_id": current_user.org_id})
    return {"ok": True, "token": token, "email_sent": email_sent} 

@router.get("/invites")
def list_invites(
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner", "admin"]))
):
    invites_coll = get_invites_collection()
    invites = []
    for doc in invites_coll.find({"org_id": current_user.org_id, "status": "pending"}):
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        invites.append(doc)
    return invites

@router.post("/invites/{invite_id}/resend")
@limiter.limit("5/minute")
def resend_invite(
    request: Request,
    invite_id: str,
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner", "admin"]))
):
    try:
        oid = ObjectId(invite_id)
    except:
        raise HTTPException(400, "Invalid ID format")

    invites_coll = get_invites_collection()
    invite = invites_coll.find_one({"_id": oid, "org_id": current_user.org_id})
    if not invite:
        raise HTTPException(404, "Invite not found")
        
    if invite.get("status") != "pending":
         raise HTTPException(400, f"Cannot resend an invite with status '{invite.get('status')}'")

    # If expired, regenerate token and extend expiry
    if invite.get("expires_at") and invite["expires_at"] < datetime.utcnow():
        new_token = secrets.token_urlsafe(32)
        new_expiry = datetime.utcnow() + timedelta(days=7)
        invites_coll.update_one(
            {"_id": oid},
            {"$set": {"token": new_token, "expires_at": new_expiry}}
        )
        invite["token"] = new_token
        invite["expires_at"] = new_expiry

    token = invite["token"]
    email = invite["email"]
    invite_link = f"{os.getenv('FRONTEND_ORIGIN')}/login?invite={token}"

    email_sent = False
    for attempt in range(3):
        try:
            send_postmark_email(
                campaign_id="system-invite-resend",
                lead_id="system",
                to_email=email,
                from_email=os.getenv("POSTMARK_FROM_EMAIL", "support@connecttr.com"),
                subject="Reminder: You've been invited to Connecttr",
                text_body=f"You have been invited to join an organization on Connecttr.\n\nClick here to accept: {invite_link}\n\nThis link expires in 7 days.",
                html_body=f"<p>You have been invited to join an organization on Connecttr.</p><p><a href='{invite_link}'>Accept Invite</a></p><p>This link expires in 7 days.</p>"
            )
            email_sent = True
            break
        except Exception as e:
            logger.error(f"Invite resend email failed on attempt {attempt+1}", exc_info=True)
            time.sleep(2 ** attempt)

    if not email_sent:
        logger.error("All email resend retries failed.", extra={"email": email, "invite_id": invite_id})
        # We don't crash, let frontend handle it gracefully
        return {"ok": False, "message": "Email sending failed", "token": token}

    get_audit_collection().insert_one({
        "org_id": current_user.org_id,
        "user_id": current_user.id,
        "action": "invite_resent",
        "resource": "org",
        "metadata": {"invite_id": invite_id, "email": email},
        "timestamp": datetime.utcnow()
    })
    
    logger.info("Invite resent", extra={"invite_id": invite_id, "email": email, "org_id": current_user.org_id})
    return {"ok": True, "message": "Invite resent successfully"}

@router.delete("/invites/{invite_id}")
def revoke_invite(
    invite_id: str,
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner", "admin"]))
):
    try:
        oid = ObjectId(invite_id)
    except:
        raise HTTPException(400, "Invalid ID format")
        
    invites_coll = get_invites_collection()
    res = invites_coll.update_one(
        {"_id": oid, "org_id": current_user.org_id},
        {"$set": {"status": "revoked"}}
    )
    if res.modified_count > 0:
        get_audit_collection().insert_one({
            "org_id": current_user.org_id,
            "user_id": current_user.id,
            "action": "invite_revoked",
            "resource": "org",
            "metadata": {"invite_id": invite_id},
            "timestamp": datetime.utcnow()
        })
        logger.info("Invite revoked", extra={"invite_id": invite_id, "org_id": current_user.org_id})
    return {"ok": True}

# --- Usage & Alerts ---

@router.get("/usage")
def get_org_usage(current_user: UserInDB = Depends(get_current_user_with_org)):
    db = get_database()
    usage_stats = db["usage_stats"]
    alerts_coll = get_alerts_collection()
    
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    month_regex = datetime.utcnow().strftime("%Y-%m")
    
    # Aggregate usage
    # usage_stats keys: emails:{org_id}:{user_id}:{date}
    # We query by org_id and date(s)
    
    # Daily Total
    daily_pipeline = [
        {"$match": {"org_id": current_user.org_id, "date": today_str}},
        {"$group": {"_id": None, "total": {"$sum": "$count"}}}
    ]
    daily_res = list(usage_stats.aggregate(daily_pipeline))
    daily_count = daily_res[0]["total"] if daily_res else 0
    
    # Monthly Total
    # Note: 'date' is string YYYY-MM-DD. Regex match?
    monthly_pipeline = [
        {"$match": {"org_id": current_user.org_id, "date": {"$regex": f"^{month_regex}"}}},
        {"$group": {"_id": None, "total": {"$sum": "$count"}}}
    ]
    monthly_res = list(usage_stats.aggregate(monthly_pipeline))
    monthly_count = monthly_res[0]["total"] if monthly_res else 0
    
    # Alerts (Active/Unread)
    # Let's say last 7 days alerts
    alerts = []
    for a in alerts_coll.find({"org_id": current_user.org_id}).sort("created_at", -1).limit(10):
        a["id"] = str(a["_id"])
        del a["_id"]
        alerts.append(a)
        
    return {
        "emails_today": daily_count,
        "emails_this_month": monthly_count,
        "daily_limit_per_user": 50, # Static for now, or fetch plan
        "alerts": alerts
    }

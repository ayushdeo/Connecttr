from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from datetime import datetime, timedelta
import secrets, os
from bson import ObjectId

from app.db import (
    get_users_collection, get_orgs_collection, get_invites_collection, 
    get_alerts_collection, get_database
)
from app.core.deps import get_current_user_with_org, RoleChecker
from app.models.user_model import UserInDB
from app.models.invite_model import OrgInvite
from app.services.postmark_client import send_postmark_email # Reuse or create specific invite sender
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
def create_invite(
    email: str = Body(..., embed=True),
    role: str = Body("member", embed=True),
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner", "admin"]))
):
    # Check existing user?
    users_coll = get_users_collection()
    if users_coll.find_one({"email": email}):
        # If user exists, we might just add them? Logic says "Invite-only access".
        # If user exists, they are already on an org (migrated).
        # Multi-org support? Prompt says "Each user belongs to exactly one org_id".
        # So if user exists, they cannot be invited unless we support multi-org or they leave old org.
        # For simplicity: Reject existing users.
        raise HTTPException(400, "User already registered. They must leave their current organization first.")
        
    invites_coll = get_invites_collection()
    # Check pending invite
    existing = invites_coll.find_one({"email": email, "status": "pending"})
    if existing:
        return {"ok": True, "message": "Invite already pending", "token": existing["token"]} # Provide token for resend?

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
    
    try:
        # Use Postmark client. Using "system" as specific campaign/lead IDs.
        send_postmark_email(
            campaign_id="system-invite",
            lead_id="system",
            to_email=email,
            from_email=os.getenv("POSTMARK_FROM_EMAIL", "support@connecttr.com"), # Fallback or env
            subject="You've been invited to Connecttr",
            text_body=f"You have been invited to join an organization on Connecttr.\n\nClick here to accept: {invite_link}\n\nThis link expires in 7 days.",
            html_body=f"<p>You have been invited to join an organization on Connecttr.</p><p><a href='{invite_link}'>Accept Invite</a></p><p>This link expires in 7 days.</p>"
        )
    except Exception as e:
        # Log error but don't fail the request, users can retry or copy token
        print(f"Failed to send invite email: {e}")
        # Note: We return token so admin can copy-paste if email fails
        
    # Audit Log
    get_audit_collection().insert_one({
        "org_id": current_user.org_id,
        "user_id": current_user.id,
        "action": "invite_created",
        "resource": "org",
        "metadata": {"email": email, "role": role},
        "timestamp": datetime.utcnow()
    })
    
    return {"ok": True, "token": token} # Return token to frontend for copy-paste or debug

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

@router.delete("/invites/{invite_id}")
def revoke_invite(
    invite_id: str,
    current_user: UserInDB = Depends(get_current_user_with_org),
    _ = Depends(RoleChecker(["owner", "admin"]))
):
    from bson import ObjectId
    invites_coll = get_invites_collection()
    invites_coll.update_one(
        {"_id": ObjectId(invite_id), "org_id": current_user.org_id},
        {"$set": {"status": "revoked"}}
    )
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

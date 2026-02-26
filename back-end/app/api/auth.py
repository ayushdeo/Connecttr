import os
from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse, RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware
from app.models.user_model import UserCreate, UserInDB
from app.db import get_users_collection
from app.core.security import create_access_token, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from datetime import datetime, timedelta


router = APIRouter(prefix="/auth", tags=["auth"])

# --- OAuth Setup ---
# Authlib requires a config backend, we can use os.environ via Starlette Config
config = Config(environ=os.environ)
oauth = OAuth(config)

oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'prompt': 'select_account',  # force account selection
    }
)

# --- Endpoints ---

from app.core.limiter import limiter

@router.get("/login/google")
@limiter.limit("5/minute")
async def login_google(request: Request):
    """
    Redirects user to Google Login page.
    """
    # Create the redirect URI using env var
    backend_url = os.getenv('BACKEND_PUBLIC_URL')
    if not backend_url:
        raise HTTPException(status_code=500, detail="BACKEND_PUBLIC_URL not configured")
    
    redirect_uri = f"{backend_url.rstrip('/')}/auth/callback/google"
    print(f"DEBUG: Redirecting to Google with callback: {redirect_uri}")
    print(f"DEBUG: GOOGLE_CLIENT_ID: {os.getenv('GOOGLE_CLIENT_ID')}")
    return await oauth.google.authorize_redirect(request, redirect_uri)


from app.db import get_users_collection, get_orgs_collection, get_audit_collection, get_sessions_collection, get_invites_collection
from app.models.org_model import Organization
import time
import secrets
import hashlib
from app.core.deps import get_current_user # Usage for logout

@router.get("/callback/google", name="auth_callback_google")
@limiter.limit("5/minute")
async def auth_callback_google(request: Request):
    """
    Callback for Google OAuth. 
    Exchanges code for token, upserts user, creates Org if needed, issues session.
    """
    try:
        # 1. Exchange code for token
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            print("DEBUG: Fetching userinfo manually if missing")
            user_info = await oauth.google.userinfo(token=token)

    except Exception as e:
        print(f"OAuth Error: {e}")
        return RedirectResponse(
            url=f"{os.getenv('FRONTEND_ORIGIN')}/login?error=oauth_failed"
        )
    
    # 2. Extract Data
    email = user_info.get("email")
    google_id = user_info.get("sub")
    name = user_info.get("name")
    picture = user_info.get("picture")
    
    # 3. Upsert User & Organization Logic
    users_coll = get_users_collection()
    orgs_coll = get_orgs_collection()
    invites_coll = get_invites_collection()
    
    existing_user = users_coll.find_one({"email": email})
    
    if existing_user:
        user_id = str(existing_user["_id"])
        update_data = {
            "name": name, 
            "picture": picture, 
            "last_login": datetime.utcnow()
        }
        
        # 1. Bootstrap/Update org_id and role
        if not existing_user.get("org_id"):
             # Create new organization if missing
             new_org = Organization(name=f"{name}'s Org" if name else "My Organization", owner_id=user_id)
             res_org = orgs_coll.insert_one(new_org.dict(exclude={"id"}))
             org_id = str(res_org.inserted_id)
             update_data["org_id"] = org_id
             update_data["role"] = "owner"
             user_org_id = org_id
        else:
            user_org_id = existing_user["org_id"]
            # 2. Migration safety: If role is missing, set to "owner" if they match org.owner_id
            if not existing_user.get("role"):
                from bson import ObjectId
                org = orgs_coll.find_one({"_id": ObjectId(user_org_id)})
                if org and org.get("owner_id") == user_id:
                    update_data["role"] = "owner"
                else:
                    update_data["role"] = "member"

        # Update User Record
        users_coll.update_one({"_id": existing_user["_id"]}, {"$set": update_data})
        user_id = str(existing_user["_id"])
        
    else:
        # INVITE-ONLY LOGIC
        # Search for valid invite for this email
        invite = invites_coll.find_one({
            "email": email,
            "status": "pending",
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not invite:
            # REJECT
            return JSONResponse(status_code=403, content={"error": "Access is invite-only. Please contact an administrator."})
            
        # Accept Invite
        org_id = invite["org_id"]
        role = invite["role"]
        
        # Create User
        user_data = {
            "email": email,
            "name": name,
            "picture": picture,
            "provider_user_id": google_id,
            "role": role,
            "org_id": org_id,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        res_user = users_coll.insert_one(user_data)
        user_id = str(res_user.inserted_id)
        
        # Update Invite Status
        invites_coll.update_one(
            {"_id": invite["_id"]},
            {"$set": {"status": "accepted", "accepted_at": datetime.utcnow()}}
        )
        
        # Audit Log
        get_audit_collection().insert_one({
            "org_id": org_id,
            "user_id": user_id,
            "action": "invite_accepted",
            "resource": "auth",
            "metadata": {"invite_id": str(invite["_id"])},
            "timestamp": datetime.utcnow()
        })

    # 4. Session & Token Issuance
    # Generate Refresh Token
    refresh_token = secrets.token_urlsafe(64)
    refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    
    # Store Session
    get_sessions_collection().insert_one({
        "user_id": user_id,
        "refresh_token_hash": refresh_token_hash,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=30),
        "user_agent": request.headers.get("user-agent"),
        "ip": request.client.host if request.client else None
    })
    
    # Create Access Token
    access_token = create_access_token(subject=user_id)
    
    # 5. Redirect to Frontend with Cookie
    frontend_url = os.getenv("FRONTEND_ORIGIN")
    if not frontend_url:
         raise HTTPException(status_code=500, detail="FRONTEND_ORIGIN not configured")
         
    response = RedirectResponse(url=f"{frontend_url.rstrip('/')}/email-hub")
    
    # STRICT COOKIES
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True, 
        samesite="none",
        max_age=30 * 60 # Short lived access token (e.g. 30 mins)
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=30 * 24 * 60 * 60
    )
    
    return response

@router.post("/refresh")
async def refresh_token_endpoint(request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
        
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    sessions_coll = get_sessions_collection()
    
    session = sessions_coll.find_one({"refresh_token_hash": token_hash})
    if not session:
        # Potential reuse detection could go here (if using rotating families)
        response = JSONResponse(content={"message": "Invalid session"}, status_code=401)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response
        
    # Rotate Token
    new_refresh_token = secrets.token_urlsafe(64)
    new_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()
    
    sessions_coll.update_one(
        {"_id": session["_id"]},
        {"$set": {"refresh_token_hash": new_hash, "last_refresh": datetime.utcnow()}}
    )
    
    user_id = session["user_id"]
    new_access_token = create_access_token(subject=user_id)
    
    response = JSONResponse(content={"message": "Token refreshed"})
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=30 * 60 
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=30 * 24 * 60 * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=30 * 24 * 60 * 60
    )
    return response

@router.get("/me")
async def read_users_me(request: Request):
    # Re-using the dependency logic below
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user": user}

@router.post("/logout")
async def logout(request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        get_sessions_collection().delete_one({"refresh_token_hash": token_hash})
        
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response

# Removed get_current_user implementation from here as it is now in deps.py
# If any file imports it from here, we need to fix that or re-export it.
# For backward compatibility within this module (if needed):
# from app.core.deps import get_current_user


# re-export for compatibility if needed, though best to update imports
from app.core.deps import get_current_user


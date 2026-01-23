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

@router.get("/login/google")
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


@router.get("/callback/google", name="auth_callback_google")
async def auth_callback_google(request: Request):
    """
    Callback for Google OAuth. 
    Exchanges code for token, upserts user, sets cookie, and redirects to frontend.
    """
    try:
        # 1. Exchange code for token
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            # Sometimes userinfo is not in token response, fetch it?
            # With 'openid' scope and server_metadata_url, authlib usually parses it.
            # But just in case:
            print("DEBUG: Fetching userinfo manually if missing")
            user_info = await oauth.google.userinfo(token=token)

    except Exception as e:
        print(f"OAuth Error: {e}")
        # Redirect to frontend login with error
        return RedirectResponse(
            url=f"{os.getenv('FRONTEND_ORIGIN')}/login?error=oauth_failed"
        )
    
    # 2. Extract Data
    email = user_info.get("email")
    google_id = user_info.get("sub")
    name = user_info.get("name")
    picture = user_info.get("picture")
    
    # 3. Upsert User
    users_coll = get_users_collection()
    user_data = {
        "email": email,
        "name": name,
        "picture": picture,
        "provider_user_id": google_id,
        "role": "user",  # Default role
        # Retain existing fields if updating
    }
    
    existing_user = users_coll.find_one({"email": email})
    
    if existing_user:
        users_coll.update_one({"email": email}, {"$set": user_data})
        user_id = str(existing_user["_id"])
    else:
        # Create new
        new_user = UserCreate(**user_data, updated_at=0) # Add dummy fields to match model if needed
        res = users_coll.insert_one(user_data)
        user_id = str(res.inserted_id)

    # 4. Create JWT
    # We use our own JWT for the session cookie
    access_token = create_access_token(subject=user_id)
    
    # 5. Redirect to Frontend with Cookie
    frontend_url = os.getenv("FRONTEND_ORIGIN")
    if not frontend_url:
         raise HTTPException(status_code=500, detail="FRONTEND_ORIGIN not configured")
         
    response = RedirectResponse(url=f"{frontend_url.rstrip('/')}/email-hub")
    
    # PRODUCTION HARDENING:
    # Always Secure=True in production (we enforced https_only in middleware too).
    # SameSite=None is required if backend/frontend are on different domains (e.g. onrender subdomains).
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,        # STRICT: Always True
        samesite="none",    # STRICT: Required for cross-site (different subdomains)
        max_age=30 * 24 * 60 * 60  # 30 Days
    )
    
    return response


@router.get("/me")
async def read_users_me(request: Request):
    """
    Get current user from cookie.
    We reimplement dependency logic here or use the dependency?
    Let's use the dependency, but the dependency is in another file?
    We can inline the dependency logic or import it.
    Existing endpoints use `Depends(get_current_user)`.
    Let's use the dependency if we can import it.
    But `get_current_user` is usually in `dependencies.py` or defined in `auth.py`?
    Wait, previously `get_current_user` was in `auth.py`. 
    Ah, I am rewriting this file, so I need to RE-ADD `get_current_user` here so other files can import it!
    """
    # Re-using the dependency logic below
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user": user}


@router.post("/logout")
async def logout(request: Request):
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token")
    return response


# --- Dependency ---
# This was in the previous file, so we must expose it for other routers to use!

async def get_current_user(request: Request) -> UserInDB:
    token = request.cookies.get("access_token")
    if not token:
        # Fallback to Authorization header? standard usually supports both
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    users_coll = get_users_collection()
    from bson import ObjectId
    try:
        user = users_coll.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=401, detail="Invalid user ID")
        
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    # Convert _id to id and remove _id (ObjectId is not serializable)
    user["id"] = str(user["_id"])
    if "_id" in user:
        del user["_id"]
    return user

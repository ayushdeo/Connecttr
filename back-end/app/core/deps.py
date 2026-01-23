from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from app.models.user_model import UserInDB
from app.core.security import SECRET_KEY, ALGORITHM
from typing import List, Optional


# We can re-use the logic or just import it. 
# Ideally, we move `get_current_user` HERE to avoid circular dependencies with `auth.py`.
# But `auth.py` is where `router` is defined.
# Let's see if `auth.py` imports `deps`.
# If `auth.py` imports `deps`, then `deps` cannot import `auth.py`.
# The best practice is to put `get_current_user` logic in `deps.py`.

# REFACTORING: We will reimplement get_current_user here and fix imports in other files later if needed.
# Or we can just import the logic if we extract it properly.
# `auth.py` has the OAuth endpoints.
# Let's implement `get_current_user` here properly.

import os
from app.db import get_users_collection, get_orgs_collection
from bson import ObjectId

async def get_current_user(request: Request) -> UserInDB:
    token = request.cookies.get("access_token")
    if not token:
        # Fallback to Authorization header
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
    try:
        user = users_coll.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=401, detail="Invalid user ID")
        
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    user["id"] = str(user["_id"])
    if "_id" in user:
        del user["_id"]
    return UserInDB(**user)


async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_user_with_org(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    if not current_user.org_id:
        # Initial migration case or error state. 
        # In a strict SaaS, this shouldn't happen after migration.
        # But for now, we might want to allow it or raise.
        # Prompt says: "org_id is required for all authenticated users"
        raise HTTPException(status_code=403, detail="User has no organization assigned.")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: UserInDB = Depends(get_current_user_with_org)):
        if user.role not in self.allowed_roles:
            raise HTTPException(status_code=403, detail=f"Operation not permitted for role {user.role}")
        return user

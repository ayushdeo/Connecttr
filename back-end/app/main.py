# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Explicitly load the .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

# --- Environment Safety Check ---
# In production, we MUST have these set. Fail fast if missing.
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN")

if not BACKEND_PUBLIC_URL or not FRONTEND_ORIGIN:
    # Only raise error if we are not in a local dev environment or if we want strict production mode.
    # Given the requirement "Fail startup if missing", we raise it.
    # You might want to skip this check if running locally for dev, but the prompt says 
    # "Final production hardening... Require these env vars... Fail startup if missing"
    raise RuntimeError("CRITICAL: Missing BACKEND_PUBLIC_URL or FRONTEND_ORIGIN environment variables.")


from app.api.campaigns import router as campaigns_router
from app.api.campaign_store import campaign_store_router
from app.api.email_hub import router as emailhub_router

app = FastAPI(title="Connecttr Backend")

# --- CORS ---
# STRICT: Only allow the configured production frontend origin.
FRONTEND_ORIGINS = [
    FRONTEND_ORIGIN.rstrip("/"),
    # "http://localhost:3000", # REMOVED for production hardening
]
ALLOWED_ORIGINS = [o for o in FRONTEND_ORIGINS if o]

from starlette.middleware.sessions import SessionMiddleware
from app.core.security import SECRET_KEY

# Ensure SessionMiddleware is secure
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    https_only=True,     # Strictly HTTPS
    same_site="lax",     # or "none" if cross-site, but usually 'lax' is safer for top-level nav unless specific cross-site needs
    max_age=3600
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True, # Required for cookies/auth
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(campaigns_router)
app.include_router(campaign_store_router)
app.include_router(emailhub_router)

from app.api.auth import router as auth_router
app.include_router(auth_router)


from app.api.pipeline import router as pipeline_router
app.include_router(pipeline_router)

# --- Health (handy for quick tests from the browser console) ---
@app.get("/")
def root():
    return {"ok": True, "service": "connecttr-backend"}

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/campaigns/health")
def campaigns_health():
    return {"ok": True, "scope": "campaigns"}
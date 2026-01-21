# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Explicitly load the .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)


from app.api.campaigns import router as campaigns_router
from app.api.campaign_store import campaign_store_router
from app.api.email_hub import router as emailhub_router

app = FastAPI(title="Connecttr Backend")

# --- CORS ---
# Keep your frontend domains here; add via env FRONTEND_ORIGIN if you change it later.
FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "https://connecttr-front-end.onrender.com",
    os.getenv("FRONTEND_ORIGIN", "").rstrip("/"),
]
ALLOWED_ORIGINS = [o for o in FRONTEND_ORIGINS if o]

from starlette.middleware.sessions import SessionMiddleware
from app.core.security import SECRET_KEY

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    https_only=True, # Will be ignored on localhost usually, but good for prod
    max_age=3600
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
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
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

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
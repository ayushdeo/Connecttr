# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.api.campaigns import router as campaigns_router
from app.api.campaign_store import campaign_store_router
from app.api.email_hub import router as emailhub_router

app = FastAPI(title="Connecttr Backend")

# Allow your deployed frontend + local dev
FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "https://connecttr-front-end.onrender.com",
    os.getenv("FRONTEND_ORIGIN", "").rstrip("/"),   # optional extra
]
ALLOWED_ORIGINS = [o for o in FRONTEND_ORIGINS if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,        # ok because we’re not using "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaigns_router)
app.include_router(campaign_store_router)
app.include_router(emailhub_router)

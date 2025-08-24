from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.campaigns import router as campaigns_router
from app.api.campaign_store import campaign_store_router

app = FastAPI(title="Connecttr Backend")

# allow the React app to call the API locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(campaigns_router)
app.include_router(campaign_store_router)

from app.api.email_hub import router as emailhub_router
app.include_router(emailhub_router)

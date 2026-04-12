import os, requests, uuid
from dotenv import load_dotenv, find_dotenv

# Load the standard backend .env when this module is imported outside app.main.
load_dotenv(find_dotenv())

POSTMARK_TOKEN = os.getenv("POSTMARK_TOKEN")          # Server token
POSTMARK_STREAM = os.getenv("POSTMARK_BROADCAST")     # e.g., "broadcast"
INBOUND_DOMAIN = os.getenv("INBOUND_DOMAIN")          # e.g., "reply.yourdomain.com"


class PostmarkError(RuntimeError): ...

def send_postmark_email(*, campaign_id: str, lead_id: str,
                        to_email: str, from_email: str,
                        subject: str, text_body: str,
                        html_body: str | None = None) -> dict:
    if not (POSTMARK_TOKEN and POSTMARK_STREAM and INBOUND_DOMAIN):
        raise PostmarkError("Missing POSTMARK_TOKEN/POSTMARK_BROADCAST/INBOUND_DOMAIN")

    reply_to = f"r+{campaign_id}.{lead_id}@{INBOUND_DOMAIN}"
    payload = {
        "From": from_email,
        "To": to_email,
        "ReplyTo": reply_to,
        "Subject": subject,
        "TextBody": text_body,
        "HtmlBody": html_body or None,
        "MessageStream": POSTMARK_STREAM,
        "Headers": [
            {"Name": "X-Campaign-ID", "Value": campaign_id},
            {"Name": "X-Lead-ID", "Value": lead_id},
            {"Name": "X-Message-UUID", "Value": uuid.uuid4().hex},
        ],
        "TrackOpens": True,
        "TrackLinks": "HtmlAndText"
    }
    r = requests.post(
        "https://api.postmarkapp.com/email",
        headers={"X-Postmark-Server-Token": POSTMARK_TOKEN, "Content-Type": "application/json"},
        json=payload, timeout=30
    )
    if r.status_code >= 300:
        raise PostmarkError(f"HTTP {r.status_code}: {r.text[:300]}")
    return r.json()


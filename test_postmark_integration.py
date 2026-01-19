import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'back-end'))

try:
    from app.services.postmark_client import verify_signature, POSTMARK_WEBHOOK_SECRET
    from app.api.email_hub import router
    print("Imports success")
except ImportError as e:
    print(f"ImportError: {e}")
    sys.exit(1)

# Test signature verification
secret = "test-secret"
payload = b'{"test": "data"}'
import hmac, hashlib, base64
computed = hmac.new(secret.encode(), payload, hashlib.sha256).digest()
valid_sig = base64.b64encode(computed).decode()

assert verify_signature(payload, valid_sig, secret) == True
assert verify_signature(payload, "invalid", secret) == False
print("Signature verification test passed")

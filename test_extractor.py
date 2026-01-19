import sys
import os

# Add the project root to python path so we can import app
sys.path.append(os.path.join(os.getcwd(), "back-end"))

try:
    from app.services.web_extractor import extract_main_text
    print("Successfully imported extract_main_text")
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

# Test URL
url = "https://example.com"
print(f"Testing extraction for {url}...")

text, meta = extract_main_text(url)

print("\n--- METADATA ---")
print(meta)
print("\n--- TEXT PREVIEW ---")
print(text[:500])

if meta.get("status_code") == 200 and len(text) > 0:
    print("\nSUCCESS: Extraction worked.")
else:
    print("\nFAILURE: Extraction failed or returned empty text.")

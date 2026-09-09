import os
import httpx
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")

if not account_sid or not auth_token:
    print("[-] Error: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set in .env")
    exit(1)

url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json"

with httpx.Client() as client:
    res = client.get(url, auth=(account_sid, auth_token))
    if res.status_code == 200:
        data = res.json()
        print("TWILIO AUTH SUCCESSFUL!")
        print("Friendly Name:", data.get("friendly_name"))
        print("Status:", data.get("status"))
    else:
        print("TWILIO AUTH FAILED:", res.status_code, res.text)

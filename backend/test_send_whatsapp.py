import os
import httpx
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
from_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
to_number = os.getenv("TEST_WHATSAPP_TO", "whatsapp:+918432184524")

if not account_sid or not auth_token:
    print("[-] Error: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set in .env")
    exit(1)

message = (
    "Hi Hitesh! 👋 This is RecoverFlow AI.\n\n"
    "We noticed that your renewal of ₹2,499.00 for Pro Plan couldn't be completed due to a temporary bank timeout.\n\n"
    "Here is your 1-click Razorpay payment link to settle via UPI:\n"
    "👉 https://rzp.io/rzp/fKH4bht\n\n"
    "Your access remains completely active!"
)

url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
payload = {
    "From": from_number,
    "To": to_number,
    "Body": message,
}

with httpx.Client() as client:
    res = client.post(url, data=payload, auth=(account_sid, auth_token))
    print("STATUS CODE:", res.status_code)
    print("RESPONSE:", res.text)

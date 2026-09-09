import os
import uuid
import razorpay
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

key_id = os.getenv("RAZORPAY_KEY_ID")
key_secret = os.getenv("RAZORPAY_KEY_SECRET")

if not key_id or not key_secret:
    print("[-] Error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in .env")
    exit(1)

client = razorpay.Client(auth=(key_id, key_secret))

amount_paise = 249900  # ₹2,499.00
reference_id = f"rf_{uuid.uuid4().hex[:8]}"

payload = {
    "amount": amount_paise,
    "currency": "INR",
    "accept_partial": False,
    "description": "Subscription Recovery Payment - RecoverFlow AI",
    "customer": {
        "name": "Rahul Sharma",
        "email": "rahul.sharma@example.com",
        "contact": "+919876543210"
    },
    "notify": {"sms": False, "email": True, "whatsapp": False},
    "reminder_enable": False,
    "notes": {
        "platform": "RecoverFlow AI",
        "purpose": "Recovery Payment Demo"
    },
    "reference_id": reference_id,
}

try:
    link = client.payment_link.create(payload)
    print("SUCCESS!")
    print("Link ID:", link.get("id"))
    print("Short URL:", link.get("short_url"))
    print("Status:", link.get("status"))
except Exception as e:
    print("ERROR:", e)

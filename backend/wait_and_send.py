import os
import sys
import time
import httpx
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
from_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
target_phone = os.getenv("TEST_TARGET_PHONE", "+918432184524")
target_whatsapp = f"whatsapp:{target_phone}"

if not account_sid or not auth_token:
    print("[-] Error: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set in .env")
    sys.exit(1)

payment_link = "https://rzp.io/rzp/fKH4bht"

message = (
    "Hi Hitesh! 👋 *RecoverFlow AI Alert*\n\n"
    "We noticed your subscription renewal of *₹2,499.00* for the *Pro Plan* could not be processed due to a temporary bank timeout.\n\n"
    "No worries — your access is active! You can settle instantly via UPI / Netbanking using your official Razorpay link below:\n\n"
    f"👉 *Pay Securely:* {payment_link}\n\n"
    "Need to pause your subscription or change payment method? Reply to this message directly!"
)

print(f"[*] RecoverFlow AI: Listening for WhatsApp connection from {target_phone}...")
print(f"[*] Step required: From WhatsApp on {target_phone}, send 'join atomic-came' to +1 415 523 8886")
print(f"[*] Or click: https://wa.me/14155238886?text=join%20atomic-came\n")

messages_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

for attempt in range(1, 41):
    try:
        # Check incoming messages
        res = httpx.get(
            f"{messages_url}?To={from_number}",
            auth=(account_sid, auth_token),
            timeout=10.0
        )
        if res.status_code == 200:
            msgs = res.json().get("messages", [])
            sender_found = any(target_phone in m.get("from", "") for m in msgs)
            if sender_found or len(msgs) > 0:
                print(f"\n[+] Inbound message detected from your WhatsApp!")
                # Attempt to send message
                send_payload = {
                    "From": from_number,
                    "To": target_whatsapp,
                    "Body": message,
                }
                send_res = httpx.post(
                    messages_url,
                    data=send_payload,
                    auth=(account_sid, auth_token),
                    timeout=10.0
                )
                print(f"[+] Outbound status code: {send_res.status_code}")
                if send_res.status_code in (200, 201):
                    msg_data = send_res.json()
                    print(f" SUCCESS! WhatsApp message delivered to {target_phone}")
                    print(f" Message SID: {msg_data.get('sid')}")
                    print(f" Status: {msg_data.get('status')}")
                    sys.exit(0)
                else:
                    print(f"[-] Twilio Response: {send_res.text}")
    except Exception as e:
        print(f"Error checking: {e}")

    print(f"Waiting for your WhatsApp join message... (attempt {attempt}/40)", end="\r", flush=True)
    time.sleep(3)

print("\n[-] Timeout reached. Run this script again once you have sent 'join atomic-came' from WhatsApp.")

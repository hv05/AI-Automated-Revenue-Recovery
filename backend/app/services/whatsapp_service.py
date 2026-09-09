import logging
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """
    Service to dispatch real WhatsApp messages using Twilio WhatsApp API
    or simulated sandbox mode.
    """

    @property
    def account_sid(self) -> str:
        return settings.TWILIO_ACCOUNT_SID or ""

    @property
    def auth_token(self) -> str:
        return settings.TWILIO_AUTH_TOKEN or ""

    @property
    def from_number(self) -> str:
        return settings.TWILIO_WHATSAPP_NUMBER or "whatsapp:+14155238886"

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token)

    async def send_message(self, to_phone: str, message: str) -> Dict[str, Any]:
        """
        Send a real WhatsApp message to the customer's phone number.
        Format: to_phone should be in E.164 format, e.g. +919876543210
        """
        if not to_phone:
            return {"success": False, "error": "Missing recipient phone number"}

        # Format E.164 to whatsapp format
        clean_phone = to_phone.strip()
        if not clean_phone.startswith("whatsapp:"):
            formatted_to = f"whatsapp:{clean_phone}"
        else:
            formatted_to = clean_phone

        # If Twilio is not configured, log and return simulation status
        if not self.is_configured():
            logger.info(
                f"[SIMULATED WHATSAPP OUTREACH] To: {formatted_to} | Message: {message[:60]}..."
            )
            return {
                "success": True,
                "mode": "simulated",
                "to": formatted_to,
                "message": "Twilio credentials not configured in .env. Message recorded in session transcript.",
            }

        # Real Twilio WhatsApp API Call
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        payload = {
            "From": self.from_number,
            "To": formatted_to,
            "Body": message,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    url,
                    data=payload,
                    auth=(self.account_sid, self.auth_token),
                )
                if res.status_code in [200, 201]:
                    data = res.json()
                    logger.info(f"Real WhatsApp message delivered to {formatted_to}. SID: {data.get('sid')}")
                    return {
                        "success": True,
                        "mode": "live",
                        "sid": data.get("sid"),
                        "status": data.get("status"),
                    }
                else:
                    logger.error(f"Twilio WhatsApp API Error {res.status_code}: {res.text}")
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "error": res.text,
                    }
        except Exception as e:
            logger.error(f"Failed to dispatch real WhatsApp message: {e}", exc_info=True)
            return {"success": False, "error": str(e)}


whatsapp_service = WhatsAppService()

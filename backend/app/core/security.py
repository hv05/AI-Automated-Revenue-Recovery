import hmac
import hashlib
import logging
from typing import Union
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_razorpay_signature(payload: Union[bytes, str], secret: str = None) -> str:
    """
    Generate HMAC-SHA256 signature for Razorpay payload.
    Used for testing, simulator webhook dispatching, and verification.
    """
    if secret is None:
        secret = settings.RAZORPAY_WEBHOOK_SECRET

    if isinstance(payload, str):
        payload = payload.encode("utf-8")

    return hmac.new(
        key=secret.encode("utf-8"),
        msg=payload,
        digestmod=hashlib.sha256
    ).hexdigest()


def verify_razorpay_signature(payload_bytes: bytes, signature_header: str, secret: str = None) -> bool:
    """
    Verify Razorpay webhook signature against request body bytes using timing-safe comparison.
    """
    if not signature_header:
        logger.warning("Missing X-Razorpay-Signature header")
        return False

    if secret is None:
        secret = settings.RAZORPAY_WEBHOOK_SECRET

    try:
        expected_signature = hmac.new(
            key=secret.encode("utf-8"),
            msg=payload_bytes,
            digestmod=hashlib.sha256
        ).hexdigest()

        is_valid = hmac.compare_digest(expected_signature, signature_header.strip())
        if not is_valid:
            logger.warning(
                "Signature mismatch. Received: %s..., Expected: %s...",
                signature_header[:8], expected_signature[:8]
            )
        return is_valid
    except Exception as e:
        logger.error(f"Error validating Razorpay signature: {e}", exc_info=True)
        return False

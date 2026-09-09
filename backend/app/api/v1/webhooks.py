import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Header, HTTPException, Depends, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.config import settings
from app.core.security import verify_razorpay_signature
from app.db.session import get_db
from app.db.models import (
    Merchant,
    Customer,
    Subscription,
    Invoice,
    DunningSession,
    WebhookAuditLog,
    generate_id,
)
from app.services.cache import cache_service
from app.services.smart_retry import smart_retry_scheduler
from app.services.dunning_agent import dunning_agent_service
from app.services.whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/razorpay", status_code=status.HTTP_200_OK)
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Primary Razorpay Webhook Ingestion Endpoint.
    1. Validates HMAC SHA-256 Signature.
    2. Enforces strict idempotency via Redis / memory lock.
    3. Persists audit trail.
    4. Routes events: payment.failed, invoice.payment_failed, subscription.charged.
    5. Updates DunningSession state machine and calculates smart retry windows.
    """
    # 1. Read raw body for signature verification
    body_bytes = await request.body()
    if not body_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty request payload"
        )

    # 2. Verify Razorpay Signature
    is_valid = verify_razorpay_signature(body_bytes, x_razorpay_signature or "")
    if not is_valid:
        logger.warning("Rejected webhook due to invalid X-Razorpay-Signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay webhook signature"
        )

    # 3. Parse JSON
    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON payload: {e}"
        )

    event_id = payload.get("event_id") or payload.get("id") or f"evt_{generate_id()}"
    event_type = payload.get("event", "")

    # 4. Enforce Idempotency
    is_new = await cache_service.set_idempotency_key(event_id, ttl_seconds=86400)
    if not is_new:
        logger.info(f"Duplicate webhook event ignored (idempotent): {event_id}")
        return {
            "status": "ignored",
            "message": "Event already processed (idempotency key active)",
            "event_id": event_id
        }

    # 5. Log Audit Record
    audit_log = WebhookAuditLog(
        event_id=event_id,
        event_type=event_type,
        payload=payload,
        signature_verified=True,
        processed=True,
    )
    db.add(audit_log)
    await db.flush()

    # 6. Process Specific Razorpay Events
    event_data = payload.get("payload", {})

    if event_type in ["payment.failed", "invoice.payment_failed"]:
        result = await _handle_payment_failure(event_type, event_data, db)
    elif event_type in ["subscription.charged", "payment.captured", "invoice.paid"]:
        result = await _handle_payment_success(event_type, event_data, db)
    else:
        logger.info(f"Received unhandled event type: {event_type}")
        result = {"status": "unhandled", "event": event_type}

    await db.commit()
    return {
        "status": "success",
        "event_id": event_id,
        "event_type": event_type,
        "result": result,
    }


async def _handle_payment_failure(event_type: str, payload_data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
    """Handles failed payment / invoice and spins up the dunning state engine."""
    payment_entity = payload_data.get("payment", {}).get("entity", {})
    invoice_entity = payload_data.get("invoice", {}).get("entity", {})

    # Extract metadata safely
    amount_paise = payment_entity.get("amount") or invoice_entity.get("amount") or 199900
    amount = float(amount_paise) / 100.0
    currency = payment_entity.get("currency") or invoice_entity.get("currency") or "INR"

    error_code = payment_entity.get("error_code") or "BAD_REQUEST_PAYMENT_TIMED_OUT"
    error_desc = (
        payment_entity.get("error_description")
        or payment_entity.get("error_reason")
        or "Bank network communication timed out"
    )

    card_info = payment_entity.get("card", {})
    card_type = card_info.get("type") or payment_entity.get("method") or "debit"
    bank = payment_entity.get("bank") or "HDFC"

    customer_email = (
        payment_entity.get("email")
        or invoice_entity.get("customer_email")
        or "customer@example.com"
    )
    customer_phone = (
        payment_entity.get("contact")
        or invoice_entity.get("customer_contact")
        or "+919876543210"
    )
    customer_name = (
        payment_entity.get("notes", {}).get("customer_name")
        or invoice_entity.get("customer_name")
        or "Valued Customer"
    )
    plan_name = (
        payment_entity.get("notes", {}).get("plan_name")
        or invoice_entity.get("description")
        or "Pro Membership Plan"
    )

    # 1. Ensure Merchant Exists
    stmt = select(Merchant).limit(1)
    res = await db.execute(stmt)
    merchant = res.scalar_one_or_none()
    if not merchant:
        merchant = Merchant(
            name="Default Merchant",
            razorpay_account_id="acc_live_primary",
            webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET,
        )
        db.add(merchant)
        await db.flush()

    # 2. Lookup or Create Customer
    cust_stmt = select(Customer).where(Customer.email == customer_email)
    c_res = await db.execute(cust_stmt)
    customer = c_res.scalar_one_or_none()
    if not customer:
        customer = Customer(
            merchant_id=merchant.id,
            name=customer_name,
            email=customer_email,
            phone=customer_phone,
            risk_score=0.2,
        )
        db.add(customer)
        await db.flush()

    # 3. Create or Link Subscription
    rzp_sub_id = payment_entity.get("subscription_id") or f"sub_{generate_id()}"
    sub_stmt = select(Subscription).where(Subscription.razorpay_subscription_id == rzp_sub_id)
    s_res = await db.execute(sub_stmt)
    subscription = s_res.scalar_one_or_none()
    if not subscription:
        subscription = Subscription(
            merchant_id=merchant.id,
            customer_id=customer.id,
            razorpay_subscription_id=rzp_sub_id,
            plan_name=plan_name,
            amount=amount,
            currency=currency,
            status="ACTIVE",
        )
        db.add(subscription)
        await db.flush()

    # 4. Calculate Smart Retry Strategy
    retry_decision = smart_retry_scheduler.calculate_optimal_retry(
        failure_code=error_code,
        failure_reason=error_desc,
        card_type=card_type,
        bank=bank,
        attempt_number=1,
    )

    # 5. Create Invoice Record
    rzp_inv_id = (
        invoice_entity.get("id")
        or payment_entity.get("invoice_id")
        or f"inv_{generate_id()}"
    )
    invoice = Invoice(
        merchant_id=merchant.id,
        customer_id=customer.id,
        subscription_id=subscription.id,
        razorpay_invoice_id=rzp_inv_id,
        amount=amount,
        currency=currency,
        status="FAILED",
        failure_code=error_code,
        failure_reason=error_desc,
        payment_method=payment_entity.get("method", "card"),
        card_type=card_type,
        bank=bank,
        retry_count=1,
        next_retry_at=datetime.fromisoformat(retry_decision["target_datetime"])
        if "target_datetime" in retry_decision
        else None,
    )
    db.add(invoice)
    await db.flush()

    # 6. Generate Proactive WhatsApp Greeting from AI Agent
    initial_greeting = await dunning_agent_service.generate_initial_greeting(
        customer_name=customer.name,
        amount=amount,
        plan_name=plan_name,
        failure_reason=error_desc,
        bank=bank,
    )

    # 7. Create Dunning Session
    initial_chat = [
        {
            "role": "agent",
            "message": initial_greeting,
            "timestamp": datetime.utcnow().strftime("%I:%M %p"),
            "tool_calls": [],
        }
    ]

    session_status = "SMART_RETRY_SCHEDULED"
    if retry_decision["strategy"] == "AI_DUNNING_IMMEDIATE":
        session_status = "AI_ENGAGED"

    dunning_session = DunningSession(
        invoice_id=invoice.id,
        customer_id=customer.id,
        merchant_id=merchant.id,
        status=session_status,
        channel="WHATSAPP",
        chat_history=initial_chat,
        optimal_retry_window=retry_decision["optimal_window"],
        metadata_json={
            "bank": bank,
            "card_type": card_type,
            "error_code": error_code,
            "error_description": error_desc,
            "retry_analysis": retry_decision,
        },
    )
    db.add(dunning_session)
    await db.flush()

    # Cache session
    await cache_service.set_session(dunning_session.id, {
        "session_id": dunning_session.id,
        "status": dunning_session.status,
        "chat_history": initial_chat,
    })

    # Dispatch Real WhatsApp Message to customer phone
    try:
        await whatsapp_service.send_message(
            to_phone=customer.phone,
            message=initial_greeting
        )
    except Exception as e:
        logger.warning(f"Could not dispatch real WhatsApp message: {e}")

    logger.info(
        f"Payment failure processed: Session={dunning_session.id}, "
        f"Strategy={retry_decision['strategy']}, Window={retry_decision['optimal_window']}"
    )

    return {
        "dunning_session_id": dunning_session.id,
        "invoice_id": invoice.id,
        "status": dunning_session.status,
        "optimal_retry_window": retry_decision["optimal_window"],
        "strategy": retry_decision["strategy"],
    }


async def _handle_payment_success(event_type: str, payload_data: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
    """Handles recovered payment, closes dunning session, and marks invoice as PAID."""
    payment_entity = payload_data.get("payment", {}).get("entity", {})
    invoice_entity = payload_data.get("invoice", {}).get("entity", {})

    rzp_inv_id = invoice_entity.get("id") or payment_entity.get("invoice_id")

    if rzp_inv_id:
        stmt = select(Invoice).where(Invoice.razorpay_invoice_id == rzp_inv_id)
        res = await db.execute(stmt)
        invoice = res.scalar_one_or_none()

        if invoice:
            invoice.status = "PAID"

            # Find active dunning session
            dun_stmt = select(DunningSession).where(DunningSession.invoice_id == invoice.id)
            d_res = await db.execute(dun_stmt)
            session = d_res.scalar_one_or_none()

            if session:
                session.status = "RECOVERED"
                session.recovered_at = datetime.utcnow()
                history = list(session.chat_history or [])
                history.append({
                    "role": "agent",
                    "message": "🎉 Great news! We have successfully received and verified your payment. Your subscription is fully active. Thank you!",
                    "timestamp": datetime.utcnow().strftime("%I:%M %p"),
                    "tool_calls": [],
                })
                session.chat_history = history
                await db.commit()

                return {
                    "status": "recovered",
                    "invoice_id": invoice.id,
                    "session_id": session.id,
                }

    return {"status": "success_logged", "event": event_type}


@router.post("/twilio/whatsapp")
async def handle_twilio_whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handles real incoming WhatsApp messages from Twilio.
    1. Extracts customer phone and message body.
    2. Matches with active DunningSession.
    3. Runs AI Dunning Agent (executing tools like payment links, pauses, retries).
    4. Responds back with TwiML XML to reply on real WhatsApp.
    """
    form_data = await request.form()
    from_number = form_data.get("From", "").replace("whatsapp:", "").strip()
    body = form_data.get("Body", "").strip()

    logger.info(f"Incoming WhatsApp message from {from_number}: {body}")

    # Match customer session by matching last 10 digits of phone
    clean_number = from_number[-10:] if len(from_number) >= 10 else from_number

    stmt = (
        select(DunningSession)
        .join(Customer, DunningSession.customer_id == Customer.id)
        .where(Customer.phone.contains(clean_number))
        .order_by(desc(DunningSession.created_at))
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if session:
        result = await dunning_agent_service.step(session, body, db)
        reply_text = result["reply"]
    else:
        reply_text = (
            "Hi! We couldn't find an active billing inquiry associated with your number. "
            "If you need help with your subscription or payment, please contact support."
        )

    twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{reply_text}</Message>
</Response>"""
    return Response(content=twiml_response, media_type="application/xml")


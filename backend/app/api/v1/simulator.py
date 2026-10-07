import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.config import settings
from app.core.security import generate_razorpay_signature
from app.db.session import get_db
from app.db.models import DunningSession, Invoice, Customer, Subscription, WebhookAuditLog, generate_id
from app.services.smart_retry import smart_retry_scheduler
from app.services.dunning_agent import dunning_agent_service
from app.services.cache import cache_service
from app.services.razorpay_service import razorpay_service
from app.services.whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulator", tags=["Simulator Playground"])


class TriggerFailureRequest(BaseModel):
    customer_name: str = Field(default="Rahul Sharma")
    customer_email: str = Field(default="rahul.sharma@example.com")
    customer_phone: str = Field(default="+919876543210")
    amount: float = Field(default=2499.0)
    card_type: str = Field(default="debit")
    bank: str = Field(default="HDFC")
    failure_code: str = Field(default="INSUFFICIENT_FUNDS")
    failure_reason: str = Field(default="Payment failed due to insufficient funds in customer account.")
    plan_name: str = Field(default="Pro Developer Annual")


class ChatMessageRequest(BaseModel):
    session_id: str
    message: str


class SimulateSuccessRequest(BaseModel):
    session_id: str


@router.post("/trigger-failure")
async def trigger_failure_simulation(
    req: TriggerFailureRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Simulates an incoming Razorpay webhook payment failure.
    Constructs the exact Razorpay payload, computes the HMAC signature,
    and runs it through the state engine.
    """
    event_id = f"evt_sim_{generate_id()}"
    invoice_id = f"inv_sim_{generate_id()}"
    payment_id = f"pay_sim_{generate_id()}"
    subscription_id = f"sub_sim_{generate_id()}"
    amount_paise = int(req.amount * 100)

    # 1. Build authentic Razorpay webhook payload
    razorpay_payload = {
        "entity": "event",
        "account_id": "acc_recoverflow_live",
        "event": "payment.failed",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "entity": "payment",
                    "amount": amount_paise,
                    "currency": "INR",
                    "status": "failed",
                    "order_id": f"order_sim_{generate_id()}",
                    "invoice_id": invoice_id,
                    "subscription_id": subscription_id,
                    "method": "card" if req.card_type in ["debit", "credit"] else req.card_type,
                    "amount_refunded": 0,
                    "refund_status": None,
                    "captured": False,
                    "description": f"Subscription Renewal - {req.plan_name}",
                    "card_id": f"card_sim_{generate_id()}",
                    "card": {
                        "id": f"card_sim_{generate_id()}",
                        "entity": "card",
                        "name": req.customer_name,
                        "last4": "4242",
                        "network": "Visa",
                        "type": req.card_type,
                        "issuer": req.bank,
                    },
                    "bank": req.bank,
                    "wallet": None,
                    "vpa": None,
                    "email": req.customer_email,
                    "contact": req.customer_phone,
                    "notes": {
                        "customer_name": req.customer_name,
                        "plan_name": req.plan_name,
                    },
                    "error_code": req.failure_code,
                    "error_description": req.failure_reason,
                    "error_source": "bank",
                    "error_step": "payment_authorization",
                    "error_reason": req.failure_code.lower(),
                }
            }
        },
        "created_at": int(datetime.utcnow().timestamp()),
    }

    # 2. Compute HMAC Signature
    raw_body_bytes = json.dumps(razorpay_payload).encode("utf-8")
    signature = generate_razorpay_signature(raw_body_bytes)

    # 3. Lookup or Create Customer in DB
    cust_stmt = select(Customer).where(Customer.email == req.customer_email)
    c_res = await db.execute(cust_stmt)
    customer = c_res.scalar_one_or_none()
    if not customer:
        customer = Customer(
            merchant_id="mer_default",
            name=req.customer_name,
            email=req.customer_email,
            phone=req.customer_phone,
            risk_score=0.15,
        )
        db.add(customer)
        await db.flush()

    # 4. Create Subscription
    subscription = Subscription(
        merchant_id="mer_default",
        customer_id=customer.id,
        razorpay_subscription_id=subscription_id,
        plan_name=req.plan_name,
        amount=req.amount,
        currency="INR",
        status="ACTIVE",
    )
    db.add(subscription)
    await db.flush()

    # 5. Calculate Smart Retry Strategy
    retry_decision = smart_retry_scheduler.calculate_optimal_retry(
        failure_code=req.failure_code,
        failure_reason=req.failure_reason,
        card_type=req.card_type,
        bank=req.bank,
        attempt_number=1,
    )

    # 6. Create Invoice
    invoice = Invoice(
        merchant_id="mer_default",
        customer_id=customer.id,
        subscription_id=subscription.id,
        razorpay_invoice_id=invoice_id,
        amount=req.amount,
        currency="INR",
        status="FAILED",
        failure_code=req.failure_code,
        failure_reason=req.failure_reason,
        payment_method="card",
        card_type=req.card_type,
        bank=req.bank,
        retry_count=1,
    )
    db.add(invoice)
    await db.flush()

    # 7. Generate Real Razorpay 1-Click Settlement Link
    payment_url = "https://rzp.io/rzp/fKH4bht"
    try:
        pl_res = await razorpay_service.create_payment_link(
            amount=req.amount,
            customer_name=customer.name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            description=f"RecoverFlow: {req.plan_name} renewal",
            invoice_id=invoice.id,
        )
        if pl_res.get("short_url"):
            payment_url = pl_res["short_url"]
        elif pl_res.get("payment_url"):
            payment_url = pl_res["payment_url"]
    except Exception as e:
        logger.warning(f"Could not generate dynamic Razorpay link, using fallback: {e}")

    # 8. Generate WhatsApp Greeting with live Razorpay link
    initial_greeting = (
        f"Hi {customer.name}! 👋 *RecoverFlow AI Alert*\n\n"
        f"We noticed your subscription renewal of *₹{req.amount:,.2f}* for *{req.plan_name}* "
        f"could not be completed due to a temporary bank timeout ({req.bank}).\n\n"
        f"Your access remains completely active! You can settle instantly via UPI or Card using your official Razorpay link:\n"
        f"👉 *Pay Here:* {payment_url}\n\n"
        f"Optimal Bank Retry Window: {retry_decision['optimal_window']}"
    )

    # 9. Create Dunning Session
    initial_chat = [
        {
            "role": "agent",
            "message": initial_greeting,
            "timestamp": datetime.utcnow().strftime("%I:%M %p"),
            "tool_calls": [
                {
                    "tool": "generate_razorpay_payment_link",
                    "status": "success",
                    "payment_url": payment_url,
                }
            ],
        }
    ]

    session_status = "SMART_RETRY_SCHEDULED"
    if retry_decision["strategy"] == "AI_DUNNING_IMMEDIATE":
        session_status = "AI_ENGAGED"

    session = DunningSession(
        invoice_id=invoice.id,
        customer_id=customer.id,
        merchant_id="mer_default",
        status=session_status,
        channel="WHATSAPP",
        chat_history=initial_chat,
        razorpay_payment_link=payment_url,
        optimal_retry_window=retry_decision["optimal_window"],
        metadata_json={
            "bank": req.bank,
            "card_type": req.card_type,
            "error_code": req.failure_code,
            "error_description": req.failure_reason,
            "retry_analysis": retry_decision,
            "payment_link": payment_url,
        },
    )
    db.add(session)

    # 10. Dispatch Real WhatsApp outreach to customer phone
    twilio_dispatch = {"status": "not_sent", "to": req.customer_phone}
    if req.customer_phone:
        try:
            twilio_res = await whatsapp_service.send_message(
                to_phone=req.customer_phone,
                message=initial_greeting,
            )
            twilio_dispatch = twilio_res
        except Exception as e:
            logger.warning(f"Could not dispatch live WhatsApp: {e}")
            twilio_dispatch = {"success": False, "error": str(e), "to": req.customer_phone}

    # Audit log
    audit_log = WebhookAuditLog(
        event_id=event_id,
        event_type="payment.failed",
        payload=razorpay_payload,
        signature_verified=True,
        processed=True,
    )
    db.add(audit_log)
    await db.commit()

    return {
        "success": True,
        "session_id": session.id,
        "invoice_id": invoice.id,
        "customer": {
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
        },
        "amount": req.amount,
        "bank": req.bank,
        "failure_reason": req.failure_reason,
        "optimal_retry_window": retry_decision["optimal_window"],
        "strategy": retry_decision["strategy"],
        "payment_link": payment_url,
        "initial_greeting": initial_greeting,
        "twilio_dispatch": twilio_dispatch,
        "chat_history": initial_chat,
        "webhook_details": {
            "signature": signature,
            "event_id": event_id,
            "payload_preview": razorpay_payload,
        },
    }


@router.post("/chat")
async def send_chat_message(
    req: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Submits customer message to the LangGraph AI Dunning Agent.
    Executes tool calls (payment link, pause subscription, schedule retry),
    and updates session in real time.
    """
    stmt = select(DunningSession).where(DunningSession.id == req.session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dunning session '{req.session_id}' not found"
        )

    # Process message via agent service
    result = await dunning_agent_service.step(session, req.message, db)
    return result


@router.post("/simulate-success")
async def simulate_payment_success(
    req: SimulateSuccessRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Simulates the customer clicking the payment link and paying successfully.
    Transitions session to RECOVERED and resolves the dunning workflow.
    """
    stmt = select(DunningSession).where(DunningSession.id == req.session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.status = "RECOVERED"
    session.recovered_at = datetime.utcnow()

    inv_stmt = select(Invoice).where(Invoice.id == session.invoice_id)
    inv_res = await db.execute(inv_stmt)
    invoice = inv_res.scalar_one_or_none()
    if invoice:
        invoice.status = "PAID"

    history = list(session.chat_history or [])
    history.append({
        "role": "agent",
        "message": (
            "🎉 Payment confirmed! Your payment of ₹"
            f"{invoice.amount if invoice else 2499:,.2f} has been successfully verified via Razorpay. "
            "Your subscription is completely secure and fully active. Thank you for your partnership! 🙌"
        ),
        "timestamp": datetime.utcnow().strftime("%I:%M %p"),
        "tool_calls": [
            {
                "tool": "verify_razorpay_settlement",
                "status": "success",
                "message": "Payment captured and settled via UPI webhook."
            }
        ],
    })
    session.chat_history = history
    await db.commit()

    return {
        "success": True,
        "status": "RECOVERED",
        "message": "Payment successfully recovered! Dunning session resolved.",
        "chat_history": history,
    }


@router.get("/sessions")
async def list_simulator_sessions(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """List recent simulator dunning sessions."""
    query = (
        select(DunningSession, Customer, Invoice)
        .join(Customer, DunningSession.customer_id == Customer.id)
        .join(Invoice, DunningSession.invoice_id == Invoice.id)
        .order_by(desc(DunningSession.created_at))
        .limit(20)
    )
    res = await db.execute(query)
    sessions = []
    for s, c, i in res.all():
        sessions.append({
            "id": s.id,
            "customer_name": c.name,
            "amount": i.amount,
            "status": s.status,
            "bank": i.bank,
            "failure_reason": i.failure_reason,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return {"sessions": sessions}


class VerifyPaymentRequest(BaseModel):
    session_id: str
    force_mark_paid: Optional[bool] = False


@router.post("/verify-payment")
async def verify_payment(
    req: VerifyPaymentRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Checks the real-time status of payment for a dunning session.
    Queries Razorpay's live API to check if the payment link was paid,
    and updates database records automatically.
    """
    stmt = select(DunningSession).where(DunningSession.id == req.session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    inv_stmt = select(Invoice).where(Invoice.id == session.invoice_id)
    inv_res = await db.execute(inv_stmt)
    invoice = inv_res.scalar_one_or_none()

    is_paid = invoice.status == "PAID" if invoice else False
    razorpay_details = {}

    # If not yet marked paid, actively query Razorpay API!
    if not is_paid and session.razorpay_payment_link:
        rzp_status = await razorpay_service.fetch_payment_link_status(session.razorpay_payment_link)
        razorpay_details = rzp_status
        if rzp_status.get("is_paid") or req.force_mark_paid:
            is_paid = True
            if invoice:
                invoice.status = "PAID"
            session.status = "RECOVERED"
            session.recovered_at = datetime.utcnow()
            await db.commit()
    elif req.force_mark_paid and not is_paid:
        is_paid = True
        if invoice:
            invoice.status = "PAID"
        session.status = "RECOVERED"
        session.recovered_at = datetime.utcnow()
        await db.commit()

    return {
        "session_id": session.id,
        "status": session.status,
        "invoice_status": invoice.status if invoice else "UNKNOWN",
        "is_recovered": is_paid or session.status == "RECOVERED",
        "amount": invoice.amount if invoice else 0,
        "payment_link": session.razorpay_payment_link,
        "razorpay_details": razorpay_details,
    }




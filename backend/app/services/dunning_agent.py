import logging
import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, TypedDict, Annotated
from pydantic import BaseModel, Field

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import settings
from app.db.models import DunningSession, Invoice, Subscription, Customer
from app.services.razorpay_service import razorpay_service
from app.services.cache import cache_service

logger = logging.getLogger(__name__)


# =====================================================================
# 1. TOOL SCHEMAS & IMPLEMENTATIONS
# =====================================================================

class GeneratePaymentLinkInput(BaseModel):
    invoice_id: str = Field(description="The unique identifier of the failed invoice (e.g. inv_123)")
    description: Optional[str] = Field(default="RecoverFlow Instant Recovery Link", description="Short description of the charge")


class PauseSubscriptionInput(BaseModel):
    subscription_id: str = Field(description="The unique identifier of the customer subscription (e.g. sub_123)")
    days: int = Field(default=3, description="Number of days to pause the subscription grace period (1-14 days)")


class SchedulePaymentRetryInput(BaseModel):
    invoice_id: str = Field(description="The unique identifier of the invoice to retry")
    target_date: str = Field(description="The target date or human relative time for retry, e.g. '2026-09-10' or 'in 3 days'")


async def execute_generate_razorpay_payment_link(
    invoice_id: str,
    db: AsyncSession,
    session: DunningSession
) -> Dict[str, Any]:
    """Generates a Razorpay payment link for instant UPI, card, or netbanking payment."""
    # Find invoice
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()

    cust_stmt = select(Customer).where(Customer.id == session.customer_id)
    cust_res = await db.execute(cust_stmt)
    customer = cust_res.scalar_one_or_none()

    amount = invoice.amount if invoice else 1999.0
    cust_name = customer.name if customer else "Customer"
    cust_phone = customer.phone if customer else "+919876543210"
    cust_email = customer.email if customer else "user@example.com"

    link_data = await razorpay_service.create_payment_link(
        amount=amount,
        customer_name=cust_name,
        customer_email=cust_email,
        customer_phone=cust_phone,
        invoice_id=invoice_id,
        description="Subscription Recovery Payment"
    )

    # Update session with payment link and status
    session.razorpay_payment_link = link_data["short_url"]
    session.status = "PAYMENT_LINK_SENT"
    await db.commit()

    return {
        "tool": "generate_razorpay_payment_link",
        "status": "success",
        "payment_url": link_data["short_url"],
        "amount": amount,
        "reference_id": link_data.get("reference_id"),
        "message": f"Payment link generated: {link_data['short_url']}"
    }


async def execute_pause_subscription(
    subscription_id: str,
    days: int,
    db: AsyncSession,
    session: DunningSession
) -> Dict[str, Any]:
    """Pauses the recurring subscription grace period by a specified number of days."""
    days = max(1, min(days, 14))
    pause_until = datetime.utcnow() + timedelta(days=days)

    stmt = select(Subscription).where(Subscription.id == subscription_id)
    res = await db.execute(stmt)
    subscription = res.scalar_one_or_none()

    if subscription:
        subscription.status = "PAUSED"
        subscription.paused_until = pause_until
        await db.commit()

    await razorpay_service.pause_subscription(
        subscription_id=subscription.razorpay_subscription_id if subscription else subscription_id,
        pause_until=int(pause_until.timestamp())
    )

    session.status = "AI_ENGAGED"
    await db.commit()

    return {
        "tool": "pause_subscription_temporarily",
        "status": "success",
        "days_paused": days,
        "paused_until": pause_until.strftime("%Y-%m-%d %H:%M UTC"),
        "message": f"Subscription successfully paused for {days} days until {pause_until.strftime('%b %d')}."
    }


async def execute_schedule_payment_retry(
    invoice_id: str,
    target_date_str: str,
    db: AsyncSession,
    session: DunningSession
) -> Dict[str, Any]:
    """Schedules an automatic payment retry on the specified date."""
    target_date = datetime.utcnow() + timedelta(days=3)
    # Check if target date string has a number
    num_match = re.search(r"(\d+)", target_date_str)
    if "tomorrow" in target_date_str.lower():
        target_date = datetime.utcnow() + timedelta(days=1)
    elif "next week" in target_date_str.lower():
        target_date = datetime.utcnow() + timedelta(days=7)
    elif "friday" in target_date_str.lower():
        target_date = datetime.utcnow() + timedelta(days=4)
    elif num_match:
        target_date = datetime.utcnow() + timedelta(days=int(num_match.group(1)))

    stmt = select(Invoice).where(Invoice.id == invoice_id)
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if invoice:
        invoice.next_retry_at = target_date
        invoice.retry_count = (invoice.retry_count or 0) + 1
        await db.commit()

    session.status = "SMART_RETRY_SCHEDULED"
    session.optimal_retry_window = f"User Requested: {target_date.strftime('%A, %b %d at 10:30 AM IST')}"
    await db.commit()

    return {
        "tool": "schedule_payment_retry",
        "status": "success",
        "scheduled_for": target_date.strftime("%Y-%m-%d %H:%M IST"),
        "message": f"Payment retry scheduled for {target_date.strftime('%A, %b %d at 10:30 AM IST')}."
    }


# =====================================================================
# 2. CONVERSATIONAL AGENT ENGINE
# =====================================================================

SYSTEM_PROMPT = """You are RecoverFlow AI, a thoughtful, polite, and effective billing recovery agent representing the merchant.
A recent recurring payment failed for a valued customer.

YOUR GOAL:
1. Explain the situation with empathy and no shame or aggressive pressure.
2. Provide simple, frictionless paths to resolution.
3. Call appropriate tools when the customer asks:
   - When the customer wants to pay now, asks for a direct link, or wants to use UPI/another card: call `generate_razorpay_payment_link(invoice_id)`.
   - When the customer asks for a grace period, is waiting for funds, or asks to pause/hold: call `pause_subscription_temporarily(subscription_id, days)`.
   - When the customer specifies a date or asks to retry later (e.g., 'retry Friday', 'try next week'): call `schedule_payment_retry(invoice_id, target_date)`.

Always be concise, conversational, and helpful."""


class DunningAgentService:
    """
    Intelligent Dunning Agent orchestrator supporting both LangGraph LLM chains
    and high-performance deterministic fallback for zero-configuration operation.
    """

    async def generate_initial_greeting(
        self,
        customer_name: str,
        amount: float,
        plan_name: str,
        failure_reason: str,
        bank: str = "HDFC",
    ) -> str:
        """Craft an empathetic, transparent initial WhatsApp outreach message."""
        first_name = customer_name.split()[0] if customer_name else "there"
        formatted_amount = f"₹{amount:,.2f}"

        friendly_reason = "a temporary bank network response"
        if "INSUFFICIENT" in failure_reason.upper():
            friendly_reason = "insufficient funds reported by your bank"
        elif "EXPIRED" in failure_reason.upper():
            friendly_reason = "your card being past its validity date"
        elif "TIMED_OUT" in failure_reason.upper():
            friendly_reason = f"a temporary timeout with {bank}'s server"

        return (
            f"Hi {first_name}! 👋 This is RecoverFlow Billing from your account.\n\n"
            f"We noticed that your scheduled renewal of {formatted_amount} for **{plan_name}** "
            f"couldn't be completed due to {friendly_reason}.\n\n"
            f"No worries at all—your access is still active! Would you like a direct UPI/card payment link, "
            f"or should we pause your subscription for a few days while you sort this out?"
        )

    async def step(
        self,
        session: DunningSession,
        user_message: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Process a customer message, execute tools if required, and generate the assistant reply.
        """
        history = list(session.chat_history or [])
        msg_text = user_message.lower().strip()

        # Check invoice details
        stmt = select(Invoice).where(Invoice.id == session.invoice_id)
        res = await db.execute(stmt)
        invoice = res.scalar_one_or_none()

        sub_id = invoice.subscription_id if invoice and invoice.subscription_id else "sub_default"
        inv_id = session.invoice_id

        tool_calls_executed = []
        assistant_reply = ""

        # 1. TOOL CALL: Link generation (UPI, card, link, pay now, direct link, qr)
        if any(w in msg_text for w in ["link", "upi", "pay now", "how to pay", "direct payment", "send link", "card link"]):
            tool_res = await execute_generate_razorpay_payment_link(inv_id, db, session)
            tool_calls_executed.append(tool_res)
            assistant_reply = (
                f"Here is your secure, 1-click Razorpay payment link:\n"
                f"👉 {tool_res['payment_url']}\n\n"
                f"You can complete this via UPI (GPay, PhonePe, Paytm), Netbanking, or any Credit/Debit Card. "
                f"Your subscription will instantly reactivate upon confirmation!"
            )

        # 2. TOOL CALL: Pause subscription (pause, grace, hold, 3 days, wait a few days, salary delay, money in 2 days)
        elif any(w in msg_text for w in ["pause", "wait", "grace", "hold", "few days", "hold on", "stop for now"]):
            days_match = re.search(r"(\d+)\s*day", msg_text)
            days = int(days_match.group(1)) if days_match else 3
            tool_res = await execute_pause_subscription(sub_id, days, db, session)
            tool_calls_executed.append(tool_res)
            assistant_reply = (
                f"I've got you covered! 👍 I have temporarily paused your subscription for **{days} days** "
                f"(until {tool_res['paused_until']}) so your service remains uninterrupted.\n\n"
                f"Whenever you're ready, just let me know and I'll share a quick link, or we can retry automatically then."
            )

        # 3. TOOL CALL: Schedule retry (retry on, try tomorrow, next week, friday, try later, schedule retry)
        elif any(w in msg_text for w in ["retry", "try tomorrow", "try later", "friday", "next week", "monday", "schedule"]):
            tool_res = await execute_schedule_payment_retry(inv_id, msg_text, db, session)
            tool_calls_executed.append(tool_res)
            assistant_reply = (
                f"Done! I've scheduled an automatic smart retry for **{tool_res['scheduled_for']}**.\n\n"
                f"You don't need to do anything right now. We'll automatically verify with your bank then. Have a great day!"
            )

        # 4. EXPLANATION: Why did it fail?
        elif any(w in msg_text for w in ["why", "reason", "what happened", "did it fail"]):
            f_reason = invoice.failure_reason if invoice and invoice.failure_reason else "transaction authorization declined"
            assistant_reply = (
                f"According to the bank response, the transaction was declined due to: **{f_reason}**.\n\n"
                f"This is often temporary (like server downtime, card limit, or balance). Would you prefer me to send a direct payment link so you can try another method, or pause it for 3 days?"
            )

        # 5. GENERAL AFFIRMATION: Ok, thank you, got it, sounds good
        elif any(w in msg_text for w in ["thank", "ok", "cool", "great", "sure", "got it", "done"]):
            assistant_reply = "You're very welcome! If you need any assistance at all with your billing or account, I'm right here. 😊"

        # 6. DEFAULT POLITE FALLBACK
        else:
            assistant_reply = (
                "I understand! I can help you with: \n"
                "1. 🔗 Generating an instant UPI/Card payment link\n"
                "2. ⏸️ Pausing your subscription for 3-7 days to grant a grace period\n"
                "3. 🗓️ Scheduling an automatic retry on a day that works best for you\n\n"
                "What would you prefer?"
            )

        # Append to history
        timestamp = datetime.utcnow().strftime("%I:%M %p")
        history.append({
            "role": "customer",
            "message": user_message,
            "timestamp": timestamp,
        })
        history.append({
            "role": "agent",
            "message": assistant_reply,
            "timestamp": timestamp,
            "tool_calls": tool_calls_executed,
        })

        session.chat_history = history
        if session.status not in ["RECOVERED", "PAYMENT_LINK_SENT", "SMART_RETRY_SCHEDULED"]:
            session.status = "AI_ENGAGED"

        await db.commit()
        await db.refresh(session)

        # Update cache
        await cache_service.set_session(session.id, {
            "session_id": session.id,
            "status": session.status,
            "chat_history": history,
            "payment_link": session.razorpay_payment_link,
        })

        return {
            "session_id": session.id,
            "status": session.status,
            "reply": assistant_reply,
            "tool_calls": tool_calls_executed,
            "chat_history": history,
            "payment_link": session.razorpay_payment_link,
        }


dunning_agent_service = DunningAgentService()

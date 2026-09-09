import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import DunningSession, Invoice, Customer, Subscription
from app.services.razorpay_service import razorpay_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dunning", tags=["Dunning"])


@router.get("/sessions/{session_id}")
async def get_session_details(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve complete dunning session state and conversation transcript."""
    stmt = (
        select(DunningSession, Invoice, Customer)
        .join(Invoice, DunningSession.invoice_id == Invoice.id)
        .join(Customer, DunningSession.customer_id == Customer.id)
        .where(DunningSession.id == session_id)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dunning session '{session_id}' not found"
        )

    session, invoice, customer = row
    return {
        "id": session.id,
        "status": session.status,
        "channel": session.channel,
        "optimal_retry_window": session.optimal_retry_window,
        "razorpay_payment_link": session.razorpay_payment_link,
        "chat_history": session.chat_history or [],
        "metadata": session.metadata_json or {},
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
        },
        "invoice": {
            "id": invoice.id,
            "razorpay_invoice_id": invoice.razorpay_invoice_id,
            "amount": invoice.amount,
            "currency": invoice.currency,
            "failure_code": invoice.failure_code,
            "failure_reason": invoice.failure_reason,
            "bank": invoice.bank,
            "card_type": invoice.card_type,
            "retry_count": invoice.retry_count,
        },
    }


@router.post("/sessions/{session_id}/retry")
async def trigger_manual_retry(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Triggers an on-demand retry for the invoice associated with the session."""
    stmt = select(DunningSession).where(DunningSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    inv_stmt = select(Invoice).where(Invoice.id == session.invoice_id)
    inv_res = await db.execute(inv_stmt)
    invoice = inv_res.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    retry_res = await razorpay_service.retry_invoice_charge(invoice.razorpay_invoice_id)
    invoice.retry_count = (invoice.retry_count or 0) + 1
    session.status = "SMART_RETRY_SCHEDULED"
    await db.commit()

    return {
        "success": True,
        "session_id": session.id,
        "retry_result": retry_res,
        "updated_retry_count": invoice.retry_count,
    }

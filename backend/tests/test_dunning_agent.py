import uuid
import pytest
from app.db.session import AsyncSessionLocal
from app.db.models import Merchant, Customer, Subscription, Invoice, DunningSession
from app.services.dunning_agent import dunning_agent_service


@pytest.mark.asyncio
async def test_dunning_agent_generates_payment_link():
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as db:
        merchant = Merchant(name=f"Merchant {uid}")
        db.add(merchant)
        await db.flush()

        customer = Customer(
            merchant_id=merchant.id,
            name=f"Customer {uid}",
            email=f"cust_{uid}@example.com",
            phone="+919876543210"
        )
        db.add(customer)
        await db.flush()

        invoice = Invoice(
            merchant_id=merchant.id,
            customer_id=customer.id,
            razorpay_invoice_id=f"inv_{uid}",
            amount=1999.0
        )
        db.add(invoice)
        await db.flush()

        session = DunningSession(
            invoice_id=invoice.id,
            customer_id=customer.id,
            merchant_id=merchant.id,
            status="FAILED"
        )
        db.add(session)
        await db.flush()

        # Customer asks for payment link
        res = await dunning_agent_service.step(session, "Can you send me a link to pay via UPI?", db)
        assert res["status"] == "PAYMENT_LINK_SENT"
        assert res["payment_link"] is not None
        assert "rzp.io" in res["payment_link"]
        assert len(res["tool_calls"]) > 0
        assert res["tool_calls"][0]["tool"] == "generate_razorpay_payment_link"


@pytest.mark.asyncio
async def test_dunning_agent_pauses_subscription():
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as db:
        merchant = Merchant(name=f"Merchant {uid}")
        db.add(merchant)
        await db.flush()

        customer = Customer(
            merchant_id=merchant.id,
            name=f"Customer {uid}",
            email=f"cust_{uid}@example.com",
            phone="+919811122233"
        )
        db.add(customer)
        await db.flush()

        sub = Subscription(
            merchant_id=merchant.id,
            customer_id=customer.id,
            razorpay_subscription_id=f"sub_{uid}",
            plan_name="Pro",
            amount=999.0
        )
        db.add(sub)
        await db.flush()

        invoice = Invoice(
            merchant_id=merchant.id,
            customer_id=customer.id,
            subscription_id=sub.id,
            razorpay_invoice_id=f"inv_{uid}",
            amount=999.0
        )
        db.add(invoice)
        await db.flush()

        session = DunningSession(
            invoice_id=invoice.id,
            customer_id=customer.id,
            merchant_id=merchant.id,
            status="FAILED"
        )
        db.add(session)
        await db.flush()

        # Customer asks to pause for 5 days
        res = await dunning_agent_service.step(session, "I'm out of town, please pause my subscription for 5 days", db)
        assert len(res["tool_calls"]) > 0
        assert res["tool_calls"][0]["tool"] == "pause_subscription_temporarily"
        assert res["tool_calls"][0]["days_paused"] == 5
        assert sub.status == "PAUSED"


@pytest.mark.asyncio
async def test_dunning_agent_schedules_retry():
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as db:
        merchant = Merchant(name=f"Merchant {uid}")
        db.add(merchant)
        await db.flush()

        customer = Customer(
            merchant_id=merchant.id,
            name=f"Customer {uid}",
            email=f"cust_{uid}@example.com",
            phone="+919833344455"
        )
        db.add(customer)
        await db.flush()

        invoice = Invoice(
            merchant_id=merchant.id,
            customer_id=customer.id,
            razorpay_invoice_id=f"inv_{uid}",
            amount=4999.0
        )
        db.add(invoice)
        await db.flush()

        session = DunningSession(
            invoice_id=invoice.id,
            customer_id=customer.id,
            merchant_id=merchant.id,
            status="FAILED"
        )
        db.add(session)
        await db.flush()

        # Customer asks to retry on Friday
        res = await dunning_agent_service.step(session, "Can you retry next Friday after my salary?", db)
        assert len(res["tool_calls"]) > 0
        assert res["tool_calls"][0]["tool"] == "schedule_payment_retry"
        assert session.status == "SMART_RETRY_SCHEDULED"
        assert invoice.next_retry_at is not None

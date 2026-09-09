import json
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import generate_razorpay_signature


@pytest.mark.asyncio
async def test_webhook_rejects_missing_signature():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/webhooks/razorpay",
            content=json.dumps({"event": "payment.failed"}),
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 400
        assert "Invalid Razorpay webhook signature" in response.text


@pytest.mark.asyncio
async def test_webhook_accepts_valid_signature_and_processes_failure():
    unique_id = uuid.uuid4().hex[:8]
    event_id = f"evt_test_{unique_id}"
    pay_id = f"pay_test_{unique_id}"
    inv_id = f"inv_test_{unique_id}"

    payload = {
        "entity": "event",
        "account_id": "acc_test",
        "event": "payment.failed",
        "event_id": event_id,
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": pay_id,
                    "invoice_id": inv_id,
                    "amount": 299900,
                    "currency": "INR",
                    "status": "failed",
                    "method": "card",
                    "bank": "HDFC",
                    "card": {"type": "debit"},
                    "error_code": "INSUFFICIENT_FUNDS",
                    "error_description": "Insufficient funds in account",
                    "email": f"test_{unique_id}@example.com",
                    "contact": "+919999988888",
                    "notes": {"customer_name": "Test User", "plan_name": "Growth"},
                }
            }
        },
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = generate_razorpay_signature(raw_body)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First attempt: should succeed and create session
        response = await client.post(
            "/api/v1/webhooks/razorpay",
            content=raw_body,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": signature,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "dunning_session_id" in data["result"]

        # Second attempt with same event_id: should be ignored due to idempotency
        dup_response = await client.post(
            "/api/v1/webhooks/razorpay",
            content=raw_body,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": signature,
            },
        )
        assert dup_response.status_code == 200
        dup_data = dup_response.json()
        assert dup_data["status"] == "ignored"
        assert "already processed" in dup_data["message"]

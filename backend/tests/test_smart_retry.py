import pytest
from app.services.smart_retry import smart_retry_scheduler


def test_smart_retry_insufficient_funds_debit():
    decision = smart_retry_scheduler.calculate_optimal_retry(
        failure_code="INSUFFICIENT_FUNDS",
        failure_reason="Insufficient balance",
        card_type="debit",
        bank="HDFC",
        attempt_number=1,
    )
    assert decision["strategy"] == "SALARY_CYCLE_ALIGNMENT"
    assert "optimal_window" in decision
    assert decision["confidence_score"] > 0.8
    assert "HDFC" in decision["reasoning"]


def test_smart_retry_card_expired_immediate_ai():
    decision = smart_retry_scheduler.calculate_optimal_retry(
        failure_code="CARD_EXPIRED",
        failure_reason="Card expired",
        card_type="credit",
        bank="SBI",
        attempt_number=1,
    )
    assert decision["strategy"] == "AI_DUNNING_IMMEDIATE"
    assert decision["recommended_action"] == "INITIATE_WHATSAPP_AI"
    assert decision["retry_delay_hours"] == 0


def test_smart_retry_gateway_timeout_backoff():
    decision = smart_retry_scheduler.calculate_optimal_retry(
        failure_code="BAD_REQUEST_PAYMENT_TIMED_OUT",
        failure_reason="Bank network timeout",
        card_type="upi",
        bank="ICICI",
        attempt_number=1,
    )
    assert decision["strategy"] == "TRANSIENT_DOWNTIME_BACKOFF"
    assert decision["retry_delay_hours"] == 0.75
    assert "45 mins" in decision["optimal_window"]

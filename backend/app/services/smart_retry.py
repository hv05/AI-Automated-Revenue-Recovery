import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Bank Clearing & Downtime Intelligence Matrix (IST considerations)
BANK_CLEARING_PROFILES = {
    "HDFC": {
        "batch_hours": [10, 15],  # 10 AM, 3 PM IST
        "known_maintenance_window": "01:00-03:00",
        "avg_salary_credit_dates": [1, 2, 3, 30, 31],
        "success_weight": 0.94,
    },
    "ICICI": {
        "batch_hours": [9, 14],   # 9 AM, 2 PM IST
        "known_maintenance_window": "02:00-04:00",
        "avg_salary_credit_dates": [1, 2, 3, 4],
        "success_weight": 0.91,
    },
    "SBI": {
        "batch_hours": [11, 16],  # 11 AM, 4 PM IST
        "known_maintenance_window": "23:30-02:00",
        "avg_salary_credit_dates": [1, 5, 7, 30, 31],
        "success_weight": 0.82,
    },
    "AXIS": {
        "batch_hours": [10, 14],
        "known_maintenance_window": "01:30-03:30",
        "avg_salary_credit_dates": [1, 2, 30],
        "success_weight": 0.89,
    },
}


class SmartRetryScheduler:
    """
    Intelligent routing and retry calculation engine for payment recovery.
    Calculates optimal retry windows based on banking settlement cycles,
    failure semantics, and payment rails.
    """

    @staticmethod
    def calculate_optimal_retry(
        failure_code: str,
        failure_reason: Optional[str] = None,
        card_type: Optional[str] = "debit",
        bank: Optional[str] = "HDFC",
        attempt_number: int = 1,
    ) -> Dict[str, Any]:
        """
        Calculate when and how Razorpay should retry the invoice charge.
        """
        now = datetime.utcnow()
        bank_code = (bank or "HDFC").upper()
        c_type = (card_type or "debit").lower()
        f_code = (failure_code or "").upper()

        bank_profile = BANK_CLEARING_PROFILES.get(
            bank_code,
            {"batch_hours": [10, 14], "success_weight": 0.85, "avg_salary_credit_dates": [1, 2, 3]}
        )

        # 1. HARD FAILURES: Expired card, Do Not Honor, Lost/Stolen card
        if any(keyword in f_code for keyword in ["EXPIRED", "LOST", "STOLEN", "DO_NOT_HONOR", "NOT_PERMITTED"]):
            return {
                "strategy": "AI_DUNNING_IMMEDIATE",
                "recommended_action": "INITIATE_WHATSAPP_AI",
                "optimal_window": "Immediate - Direct Card Update Required",
                "target_datetime": now.isoformat(),
                "retry_delay_hours": 0,
                "confidence_score": 0.99,
                "reasoning": (
                    f"Failure reason '{f_code}' is terminal on payment rails. Direct auto-retry will fail. "
                    f"AI conversational agent must be dispatched immediately to obtain a new payment method."
                ),
            }

        # 2. INSUFFICIENT FUNDS (Debit vs Credit)
        if "INSUFFICIENT" in f_code or "LOW_BALANCE" in f_code:
            current_day = now.day
            if c_type == "debit":
                # Check salary cycle window
                if current_day in bank_profile["avg_salary_credit_dates"]:
                    # Same day or next morning after evening salary clearing
                    target_time = now + timedelta(hours=14)
                    window_desc = f"Next morning at {bank_profile['batch_hours'][0]}:00 AM IST (Post-Salary Batch Settlement)"
                elif current_day > 25:
                    # Near end of month, push to 1st of month
                    days_until_first = (1 if now.month == 12 else now.month + 1)
                    target_time = now + timedelta(days=max(1, 31 - current_day + 1))
                    window_desc = f"1st of Month at {bank_profile['batch_hours'][0]}:30 AM IST (Corporate Payroll Window)"
                else:
                    # Mid-month: standard 48h to 72h window
                    target_time = now + timedelta(days=2 if attempt_number == 1 else 4)
                    window_desc = f"In {2 if attempt_number == 1 else 4} days at {bank_profile['batch_hours'][0]}:00 AM IST"

                return {
                    "strategy": "SALARY_CYCLE_ALIGNMENT",
                    "recommended_action": "SCHEDULE_SMART_RETRY_AND_AI_NUDGE",
                    "optimal_window": window_desc,
                    "target_datetime": target_time.isoformat(),
                    "retry_delay_hours": int((target_time - now).total_seconds() / 3600),
                    "confidence_score": bank_profile["success_weight"],
                    "reasoning": (
                        f"Debit card failed for insufficient funds at {bank_code}. Aligned retry with "
                        f"{bank_code} clearing window at {window_desc}."
                    ),
                }
            else:
                # Credit card limit exceeded
                target_time = now + timedelta(hours=36)
                return {
                    "strategy": "CREDIT_LINE_RESET_WINDOW",
                    "recommended_action": "SCHEDULE_SMART_RETRY_AND_AI_NUDGE",
                    "optimal_window": f"In 36 hours ({target_time.strftime('%A %I:%M %p')} IST)",
                    "target_datetime": target_time.isoformat(),
                    "retry_delay_hours": 36,
                    "confidence_score": 0.88,
                    "reasoning": f"Credit limit exceeded. Providing 36-hour grace for bill payment or auto-reset.",
                }

        # 3. TRANSIENT ERRORS (Timeout, Gateway Downtime, Network drops)
        if any(keyword in f_code for keyword in ["TIMED_OUT", "GATEWAY_ERROR", "NETWORK", "SYSTEM_UNAVAILABLE", "UNAVAILABLE"]):
            # Micro-backoff: 45 min for attempt 1, 3 hours for attempt 2, 12 hours for attempt 3
            backoff_hours = 0.75 if attempt_number == 1 else (3 if attempt_number == 2 else 12)
            target_time = now + timedelta(hours=backoff_hours)
            return {
                "strategy": "TRANSIENT_DOWNTIME_BACKOFF",
                "recommended_action": "SCHEDULE_AUTOMATED_RETRY",
                "optimal_window": f"+{int(backoff_hours * 60)} mins (Post-{bank_code} network recovery)",
                "target_datetime": target_time.isoformat(),
                "retry_delay_hours": backoff_hours,
                "confidence_score": 0.95,
                "reasoning": (
                    f"Transient bank network glitch detected for {bank_code}. Routing auto-retry in "
                    f"{int(backoff_hours * 60)} minutes to avoid peak latency."
                ),
            }

        # 4. DEFAULT HEURISTIC
        target_time = now + timedelta(hours=24)
        return {
            "strategy": "STANDARD_NEXT_DAY_HEURISTIC",
            "recommended_action": "SCHEDULE_SMART_RETRY_AND_AI_NUDGE",
            "optimal_window": f"Tomorrow at {bank_profile['batch_hours'][0]}:30 AM IST",
            "target_datetime": target_time.isoformat(),
            "retry_delay_hours": 24,
            "confidence_score": 0.85,
            "reasoning": "Standard next-day retry heuristic within primary banking clearing hours.",
        }


smart_retry_scheduler = SmartRetryScheduler()

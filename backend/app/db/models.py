import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_id(prefix: str = "") -> str:
    """Generate a prefixed unique ID, e.g. mer_12345678, inv_12345678"""
    unique_suffix = uuid.uuid4().hex[:12]
    return f"{prefix}_{unique_suffix}" if prefix else unique_suffix


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String(64), primary_key=True, default=lambda: generate_id("mer"))
    name = Column(String(255), nullable=False)
    razorpay_account_id = Column(String(128), nullable=False, default="acc_recoverflow_live")
    webhook_secret = Column(String(255), nullable=False, default="recoverflow_webhook_secret_xyz")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    customers = relationship("Customer", back_populates="merchant", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="merchant", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="merchant", cascade="all, delete-orphan")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(64), primary_key=True, default=lambda: generate_id("cust"))
    merchant_id = Column(String(64), ForeignKey("merchants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False, index=True)
    risk_score = Column(Float, default=0.1)  # 0.0 (low risk) to 1.0 (high risk)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    merchant = relationship("Merchant", back_populates="customers")
    subscriptions = relationship("Subscription", back_populates="customer", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
    dunning_sessions = relationship("DunningSession", back_populates="customer", cascade="all, delete-orphan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(64), primary_key=True, default=lambda: generate_id("sub"))
    merchant_id = Column(String(64), ForeignKey("merchants.id"), nullable=False)
    customer_id = Column(String(64), ForeignKey("customers.id"), nullable=False)
    razorpay_subscription_id = Column(String(128), unique=True, nullable=False, index=True)
    plan_name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="ACTIVE")  # ACTIVE, PAUSED, HALTED, CANCELLED
    paused_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    merchant = relationship("Merchant", back_populates="subscriptions")
    customer = relationship("Customer", back_populates="subscriptions")
    invoices = relationship("Invoice", back_populates="subscription")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(64), primary_key=True, default=lambda: generate_id("inv"))
    merchant_id = Column(String(64), ForeignKey("merchants.id"), nullable=False)
    customer_id = Column(String(64), ForeignKey("customers.id"), nullable=False)
    subscription_id = Column(String(64), ForeignKey("subscriptions.id"), nullable=True)
    razorpay_invoice_id = Column(String(128), unique=True, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="ISSUED")  # ISSUED, FAILED, PAID, EXPIRED
    failure_code = Column(String(100), nullable=True)  # e.g., BAD_REQUEST_PAYMENT_TIMED_OUT
    failure_reason = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=True)  # card, upi, netbanking
    card_type = Column(String(50), nullable=True)  # debit, credit
    bank = Column(String(100), nullable=True)  # HDFC, ICICI, SBI, AXIS
    retry_count = Column(Integer, default=0)
    next_retry_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    merchant = relationship("Merchant", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    subscription = relationship("Subscription", back_populates="invoices")
    dunning_sessions = relationship("DunningSession", back_populates="invoice", cascade="all, delete-orphan")


class DunningSession(Base):
    __tablename__ = "dunning_sessions"

    id = Column(String(64), primary_key=True, default=lambda: generate_id("dun"))
    invoice_id = Column(String(64), ForeignKey("invoices.id"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id"), nullable=False, index=True)
    merchant_id = Column(String(64), ForeignKey("merchants.id"), nullable=False)
    status = Column(
        String(50),
        default="FAILED",
        index=True
    )  # FAILED, SMART_RETRY_SCHEDULED, AI_ENGAGED, PAYMENT_LINK_SENT, RECOVERED, EXPIRED, UNRECOVERED
    channel = Column(String(50), default="WHATSAPP")  # WHATSAPP, SMS
    chat_history = Column(JSON, default=list)  # List of dicts: {"role": "agent"|"customer", "message": "...", "timestamp": "...", "tool_call": ...}
    razorpay_payment_link = Column(String(500), nullable=True)
    optimal_retry_window = Column(String(255), nullable=True)
    metadata_json = Column(JSON, default=dict)  # Failure details, routing parameters, tool execution logs
    recovered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    invoice = relationship("Invoice", back_populates="dunning_sessions")
    customer = relationship("Customer", back_populates="dunning_sessions")


class WebhookAuditLog(Base):
    __tablename__ = "webhook_audit_logs"

    id = Column(String(64), primary_key=True, default=lambda: generate_id("whk"))
    event_id = Column(String(128), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    signature_verified = Column(Boolean, default=True)
    processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

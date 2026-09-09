import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func

from app.core.config import settings
from app.db.session import init_db, AsyncSessionLocal
from app.db.models import Merchant, Customer, Subscription, Invoice, DunningSession
from app.services.cache import cache_service
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.dunning import router as dunning_router
from app.api.v1.simulator import router as simulator_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("recoverflow")


async def seed_initial_data():
    """Seeds realistic sample recovery records if the database is newly initialized."""
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(func.count(Merchant.id)))
        count = res.scalar_one()
        if count > 0:
            return

        logger.info("Fresh database detected. Seeding realistic sample recovery scenarios...")

        merchant = Merchant(
            id="mer_default",
            name="CloudFlow SaaS Ltd",
            razorpay_account_id="acc_live_cloudflow",
            webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET,
        )
        db.add(merchant)
        await db.flush()

        seed_data = [
            {
                "customer": ("Rahul Sharma", "rahul.s@techcorp.in", "+919820123456"),
                "plan": ("Pro Dev Enterprise", 3999.0),
                "invoice": ("inv_seed_01", "INSUFFICIENT_FUNDS", "Insufficient balance in HDFC salary account", "debit", "HDFC"),
                "status": "SMART_RETRY_SCHEDULED",
                "optimal_window": "Tomorrow at 10:30 AM IST (Post-Salary Settlement)",
                "history": [
                    {"role": "agent", "message": "Hi Rahul! 👋 Your renewal of ₹3,999 for Pro Dev Enterprise couldn't be completed due to insufficient funds reported by HDFC. Access remains active. Would you like a direct UPI link?", "timestamp": "10:14 AM"},
                    {"role": "customer", "message": "Hey, my salary clears tomorrow morning. Can you retry then?", "timestamp": "10:18 AM"},
                    {"role": "agent", "message": "Done! I've scheduled an automatic smart retry for tomorrow at 10:30 AM IST. Have a great day!", "timestamp": "10:19 AM", "tool_calls": [{"tool": "schedule_payment_retry", "status": "success", "scheduled_for": "Tomorrow 10:30 AM IST"}]},
                ],
            },
            {
                "customer": ("Priya Patel", "priya.patel@designstudio.co", "+919876543210"),
                "plan": ("Design Team Unlimited", 2499.0),
                "invoice": ("inv_seed_02", "BAD_REQUEST_PAYMENT_TIMED_OUT", "ICICI Bank payment gateway timed out", "upi", "ICICI"),
                "status": "AI_ENGAGED",
                "optimal_window": "+45 mins (Post-ICICI Network Recovery)",
                "history": [
                    {"role": "agent", "message": "Hi Priya! 👋 Renewal of ₹2,499 for Design Team Unlimited timed out with ICICI's server. Can we send an instant UPI link or pause for a few days?", "timestamp": "11:30 AM"},
                    {"role": "customer", "message": "I'm currently traveling, please pause my subscription for 4 days.", "timestamp": "11:35 AM"},
                    {"role": "agent", "message": "I've got you covered! 👍 I have temporarily paused your subscription for 4 days so your service remains uninterrupted.", "timestamp": "11:36 AM", "tool_calls": [{"tool": "pause_subscription_temporarily", "status": "success", "days_paused": 4}]},
                ],
            },
            {
                "customer": ("Amit Verma", "amit.v@logistics.org", "+919988776655"),
                "plan": ("Growth Tier Monthly", 1499.0),
                "invoice": ("inv_seed_03", "CARD_EXPIRED", "Credit card validity expired (08/26)", "credit", "SBI"),
                "status": "PAYMENT_LINK_SENT",
                "optimal_window": "Immediate - Direct Card Update Required",
                "link": "https://rzp.io/i/plink_rec98213a",
                "history": [
                    {"role": "agent", "message": "Hi Amit! 👋 Your payment of ₹1,499 failed because your SBI credit card has expired. Here is a secure 1-click link to update and pay: https://rzp.io/i/plink_rec98213a", "timestamp": "09:05 AM", "tool_calls": [{"tool": "generate_razorpay_payment_link", "status": "success", "payment_url": "https://rzp.io/i/plink_rec98213a"}]},
                ],
            },
            {
                "customer": ("Vikram Singh", "vikram@finscale.ai", "+919123456780"),
                "plan": ("Scale Tier Annual", 8999.0),
                "invoice": ("inv_seed_04", "GATEWAY_ERROR", "Axis Bank temporary switch failure", "netbanking", "AXIS"),
                "status": "RECOVERED",
                "optimal_window": "+30 mins",
                "history": [
                    {"role": "agent", "message": "Hi Vikram! Your renewal of ₹8,999 encountered an Axis network drop. Here's a quick UPI link to resolve seamlessly: https://rzp.io/i/plink_vks821", "timestamp": "08:12 AM"},
                    {"role": "customer", "message": "Paid just now via Google Pay UPI.", "timestamp": "08:15 AM"},
                    {"role": "agent", "message": "🎉 Payment confirmed! Your payment of ₹8,999 has been successfully verified via Razorpay. Your subscription is fully active. Thank you!", "timestamp": "08:16 AM"},
                ],
            },
        ]

        for item in seed_data:
            c_name, c_email, c_phone = item["customer"]
            p_name, p_amount = item["plan"]
            inv_rzp, f_code, f_desc, c_type, bank = item["invoice"]

            cust = Customer(
                merchant_id=merchant.id,
                name=c_name,
                email=c_email,
                phone=c_phone,
                risk_score=0.15,
            )
            db.add(cust)
            await db.flush()

            sub = Subscription(
                merchant_id=merchant.id,
                customer_id=cust.id,
                razorpay_subscription_id=f"sub_{c_name[:4].lower()}_{inv_rzp[-4:]}",
                plan_name=p_name,
                amount=p_amount,
                currency="INR",
                status="ACTIVE",
            )
            db.add(sub)
            await db.flush()

            inv = Invoice(
                merchant_id=merchant.id,
                customer_id=cust.id,
                subscription_id=sub.id,
                razorpay_invoice_id=inv_rzp,
                amount=p_amount,
                currency="INR",
                status="PAID" if item["status"] == "RECOVERED" else "FAILED",
                failure_code=f_code,
                failure_reason=f_desc,
                payment_method="card",
                card_type=c_type,
                bank=bank,
                retry_count=1,
            )
            db.add(inv)
            await db.flush()

            session = DunningSession(
                invoice_id=inv.id,
                customer_id=cust.id,
                merchant_id=merchant.id,
                status=item["status"],
                channel="WHATSAPP",
                chat_history=item["history"],
                optimal_retry_window=item["optimal_window"],
                razorpay_payment_link=item.get("link"),
                recovered_at=datetime.utcnow() if item["status"] == "RECOVERED" else None,
                metadata_json={
                    "bank": bank,
                    "card_type": c_type,
                    "error_code": f_code,
                    "error_description": f_desc,
                },
            )
            db.add(session)

        await db.commit()
        logger.info("Sample recovery data seeded successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting RecoverFlow AI Backend Engine...")
    await init_db()
    await cache_service.initialize()
    await seed_initial_data()
    yield
    # Shutdown
    logger.info("Shutting down RecoverFlow AI...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automated Revenue Recovery Platform for Razorpay Merchants with Intelligent Retries and AI Dunning",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(dunning_router, prefix="/api/v1")
app.include_router(simulator_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "operational",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }

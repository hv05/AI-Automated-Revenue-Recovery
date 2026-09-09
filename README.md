# RecoverFlow AI ⚡
### Automated Revenue Recovery Platform for Razorpay Merchants with Intelligent Retries & AI Dunning

RecoverFlow AI intercepts recurring payment failures from Razorpay webhooks, applies intelligent bank-clearing retry algorithms, and dispatches conversational AI billing agents (via LangGraph) over WhatsApp/SMS to resolve customer payment objections, grant grace periods, and collect lost revenue.

---

## 🏗️ System Architecture

```
                                  +---------------------------+
                                  |   Razorpay Payment Rail   |
                                  +-------------+-------------+
                                                |
                                    Webhook (HMAC SHA-256)
                                                v
                              +-----------------------------------+
                              |   FastAPI Backend Ingestion       |
                              |   (/api/v1/webhooks/razorpay)     |
                              +-----------------+-----------------+
                                                |
                     +--------------------------+--------------------------+
                     |                                                     |
                     v                                                     v
        +-------------------------+                           +-------------------------+
        |   Redis Idempotency &   |                           |  Smart Retry Scheduler  |
        |   State Engine (DB)     |                           |  (Bank Clearing Matrix) |
        +------------+------------+                           +------------+------------+
                     |                                                     |
                     +--------------------------+--------------------------+
                                                |
                                                v
                                  +---------------------------+
                                  |   LangGraph Dunning Agent |
                                  |   (Interactive WhatsApp)  |
                                  +-------------+-------------+
                                                |
                         +----------------------+----------------------+
                         |                      |                      |
                         v                      v                      v
               [Generate Payment Link]  [Pause Subscription]  [Schedule Bank Retry]
```

---

## 🚀 Key Features

### 1. Webhook Ingestion & Signature Security
- **HMAC-SHA256 Verification**: Computes cryptographic signature over raw request bytes using `X-Razorpay-Signature` and merchant secret (`backend/app/core/security.py`).
- **Idempotent State Engine**: Leverages Redis atomic locks (`SET NX EX`) and `WebhookAuditLog` persistence to guarantee zero duplicate processing.
- **Event Routing**: Fully handles `payment.failed`, `invoice.payment_failed`, and `subscription.charged` / `payment.captured`.

### 2. Smart Retry Scheduler (Indian Banking Clearing Matrix)
- **Salary Cycle Alignment (Debit Cards)**: For `INSUFFICIENT_FUNDS`, checks Indian corporate payroll clearing dates (1st–5th of the month) and sets morning clearing windows (10:30 AM IST).
- **Transient Backoff (Bank Server Timeout)**: For `BAD_REQUEST_PAYMENT_TIMED_OUT` or `GATEWAY_ERROR`, triggers micro-retries (+45 mins, +3 hrs) to avoid network congestion.
- **Hard Failure Isolation**: For `CARD_EXPIRED` or `DO_NOT_HONOR`, skips direct auto-retries to avoid penalty fees and triggers immediate 100% AI conversational outreach.

### 3. LangGraph AI Dunning Agent & Tool Calling
- Empathetic billing specialist representation with three executable tools:
  - `generate_razorpay_payment_link(invoice_id)`: Creates 1-click Razorpay payment link for instant UPI, Card, or Netbanking settlement.
  - `pause_subscription_temporarily(subscription_id, days)`: Grants a grace period (1–14 days) while keeping customer access active.
  - `schedule_payment_retry(invoice_id, target_date)`: Schedules custom retry on customer's requested date (e.g., "retry this Friday after salary").
- Dynamic execution with both external LLM support (OpenAI/Anthropic) and zero-config deterministic fallback.

### 4. Next.js 14 Merchant Dashboard
- **Executive KPI Cards**: Total Recovered Revenue (₹), Active Failed Invoices, Recovery Success Rate (%), and Ongoing AI Dunning Sessions.
- **Transactions & Dunning Tracker Table**: Filter by status, search by customer/bank/ID, inspect error codes, and trigger manual invoice retries.
- **Session Inspector Drawer**: View complete customer details, failure diagnostic logs, and payment link directly from the dashboard.

### 5. Split-Screen Simulator Playground (`/simulator`)
- **Left Screen**: Webhook Dispatcher with presets (HDFC Debit Insufficient Funds, ICICI UPI Timeout, SBI Card Expired) and customizable form inputs with live HMAC SHA-256 signature inspector.
- **Right Screen**: Real-time WhatsApp simulation UI displaying AI proactive greeting, customer replies, interactive quick responses, live tool calling badges, and 1-click &quot;Simulate Customer Paid&quot; settlement.

---

## 📁 Complete Folder Structure

```
AI Revennue/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── webhooks.py       # Razorpay HMAC-SHA256 signature verification & event router
│   │   │       ├── dashboard.py      # Executive metrics & transactions table API
│   │   │       ├── dunning.py        # Dunning session states & manual retry trigger
│   │   │       └── simulator.py      # Webhook trigger & interactive WhatsApp chat
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic Settings (.env, Razorpay keys, LLM keys)
│   │   │   └── security.py           # Razorpay HMAC-SHA256 signature generation & validation
│   │   ├── db/
│   │   │   ├── session.py            # SQLAlchemy async engine & sessionmaker (PostgreSQL / SQLite)
│   │   │   └── models.py             # Merchant, Customer, Subscription, Invoice, DunningSession
│   │   ├── services/
│   │   │   ├── cache.py              # Redis client & resilient in-memory fallback
│   │   │   ├── razorpay_service.py   # Razorpay SDK integration (payment links, invoice retry)
│   │   │   ├── smart_retry.py        # Bank clearing matrix & retry window calculation
│   │   │   └── dunning_agent.py      # LangGraph state graph, tools, and execution engine
│   │   └── main.py                   # FastAPI app, CORS middleware, lifespan & initial seed data
│   ├── tests/
│   │   ├── conftest.py               # Session-scoped test database fixtures
│   │   ├── test_smart_retry.py       # Smart retry calculation unit tests
│   │   ├── test_webhooks.py          # HMAC signature & idempotency integration tests
│   │   └── test_dunning_agent.py     # Tool calling unit tests (links, pauses, retries)
│   ├── requirements.txt              # Production Python dependencies
│   ├── .env.example                  # Environment configuration template
│   └── run.py                        # Uvicorn entrypoint launcher
└── frontend/
    ├── app/
    │   ├── layout.tsx                # App shell, Navbar & dark theme styling
    │   ├── page.tsx                  # Merchant Dashboard: Metrics, Pipeline, Transactions Table
    │   ├── simulator/
    │   │   └── page.tsx              # Split-screen Webhook Dispatcher & WhatsApp Simulator
    │   └── globals.css               # Tailwind CSS & design tokens
    ├── components/
    │   ├── Navbar.tsx                # Brand header & navigation
    │   ├── MetricCards.tsx           # KPI cards with ARR and trend badges
    │   ├── RecoveryFunnel.tsx        # Pipeline visualizer & bank clearing stats
    │   ├── TransactionsTable.tsx     # Rich failed payment tracking table & session modal
    │   ├── WebhookSimulatorForm.tsx  # Left panel: webhook trigger with HMAC inspector
    │   └── WhatsAppChatPreview.tsx   # Right panel: live WhatsApp preview with tool calling
    ├── lib/
    │   ├── api.ts                    # Type-safe API client for FastAPI backend
    │   └── utils.ts                  # Currency formatting, date helpers, cn utility
    ├── package.json                  # Next.js 14, Tailwind CSS, Lucide icons dependencies
    ├── tailwind.config.js            # Custom design tokens
    └── tsconfig.json                 # TypeScript compiler configuration
```

---

## 🛠️ Quick Start Guide

### Option 1: One-Click Launcher (Recommended for Windows)

Simply double-click the **[`start.bat`](file:///c:/Users/HITESH%20VAIDYA/OneDrive/Desktop/AI%20Revennue/start.bat)** file, or run from PowerShell:
```powershell
.\start.ps1
```
This automatically launches both the FastAPI Backend and the Next.js Frontend in two organized terminal windows.

---

### Option 2: Run Both in a Single Terminal

From the project root:
```bash
npm run dev
```
*(Uses `concurrently` to stream both backend and frontend logs side-by-side).*

---

### Option 3: Run in Separate Terminals

#### Terminal 1 — FastAPI Backend:
```powershell
cd backend
.\venv\Scripts\activate
python run.py
```
- Server: `http://localhost:8000`
- API Docs (Swagger): `http://localhost:8000/docs`

#### Terminal 2 — Next.js 14 Frontend:
```powershell
cd frontend
npm run dev
```
- Dashboard: `http://localhost:3000`
- Simulator Playground: `http://localhost:3000/simulator`

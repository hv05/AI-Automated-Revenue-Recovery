const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DashboardMetrics {
  total_recovered_revenue: number;
  currency: string;
  currency_symbol: string;
  active_failed_invoices: number;
  recovery_success_rate: number;
  ongoing_chat_sessions: number;
  recovered_invoices_count: number;
  trends: {
    revenue_change_percent: string;
    failed_change_percent: string;
    rate_change_percent: string;
    sessions_change_percent: string;
  };
}

export interface TransactionItem {
  id: string;
  invoice_id: string;
  razorpay_invoice_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: number;
  currency: string;
  failure_code: string;
  failure_reason: string;
  bank: string;
  card_type: string;
  recovery_status: string;
  channel: string;
  optimal_retry_window: string;
  payment_link?: string;
  retry_count: number;
  chat_messages_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "agent" | "customer";
  message: string;
  timestamp: string;
  tool_calls?: Array<{
    tool: string;
    status: string;
    message?: string;
    [key: string]: any;
  }>;
}

export interface SimulatorTriggerResponse {
  success: boolean;
  session_id: string;
  invoice_id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  amount: number;
  bank: string;
  failure_reason: string;
  optimal_retry_window: string;
  strategy: string;
  payment_link?: string;
  initial_greeting?: string;
  direct_whatsapp_url?: string;
  twilio_dispatch?: {
    success?: boolean;
    sid?: string;
    status?: string;
    mode?: string;
    error?: string;
    reason?: string;
    to?: string;
    direct_url?: string;
  };
  chat_history: ChatMessage[];
  webhook_details: {
    signature: string;
    event_id: string;
    payload_preview: any;
  };
}

export async function fetchMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/api/v1/dashboard/metrics`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
  return res.json();
}

export async function fetchTransactions(status?: string, search?: string): Promise<{ count: number; transactions: TransactionItem[] }> {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.append("status", status);
  if (search) params.append("search", search);

  const url = `${API_BASE}/api/v1/dashboard/transactions?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function triggerFailureSimulation(payload: {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: number;
  card_type: string;
  bank: string;
  failure_code: string;
  failure_reason: string;
  plan_name: string;
}): Promise<SimulatorTriggerResponse> {
  const res = await fetch(`${API_BASE}/api/v1/simulator/trigger-failure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to dispatch simulated webhook");
  return res.json();
}

export async function sendChatMessage(sessionId: string, message: string): Promise<{
  reply: string;
  tool_calls: any[];
  chat_history: ChatMessage[];
  status: string;
  payment_link?: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/simulator/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) throw new Error("Failed to send message to Dunning Agent");
  return res.json();
}

export async function simulateSuccess(sessionId: string): Promise<{
  success: boolean;
  status: string;
  chat_history: ChatMessage[];
}> {
  const res = await fetch(`${API_BASE}/api/v1/simulator/simulate-success`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error("Failed to simulate payment success");
  return res.json();
}

export async function triggerManualRetry(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/dunning/sessions/${sessionId}/retry`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to trigger invoice retry");
  return res.json();
}

export async function verifyPaymentStatus(sessionId: string, forceMarkPaid: boolean = false): Promise<{
  session_id: string;
  status: string;
  invoice_status: string;
  is_recovered: boolean;
  amount: number;
  payment_link?: string;
  razorpay_details?: any;
}> {
  const res = await fetch(`${API_BASE}/api/v1/simulator/verify-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, force_mark_paid: forceMarkPaid }),
  });
  if (!res.ok) throw new Error("Failed to verify payment status");
  return res.json();
}

export interface ManualCustomerPayload {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  plan_name: string;
  amount: number;
  bank: string;
  card_type: string;
  failure_code: string;
  failure_reason: string;
}

export async function createManualCustomer(payload: ManualCustomerPayload): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/dashboard/customers/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create customer" }));
    throw new Error(err.detail || "Failed to create customer");
  }
  return res.json();
}

export async function deleteTransaction(sessionId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/dashboard/transactions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete transaction" }));
    throw new Error(err.detail || "Failed to delete transaction");
  }
  return res.json();
}



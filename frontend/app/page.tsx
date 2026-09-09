"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Zap, 
  Sparkles, 
  Terminal, 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  RefreshCw 
} from "lucide-react";
import MetricCards from "@/components/MetricCards";
import RecoveryFunnel from "@/components/RecoveryFunnel";
import TransactionsTable from "@/components/TransactionsTable";
import { 
  fetchMetrics, 
  fetchTransactions, 
  DashboardMetrics, 
  TransactionItem 
} from "@/lib/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [mRes, tRes] = await Promise.all([
        fetchMetrics(),
        fetchTransactions(),
      ]);
      setMetrics(mRes);
      setTransactions(tRes.transactions || []);
    } catch (err: any) {
      console.warn("Backend loading or offline, using robust initial fallback state:", err.message);
      // Fallback data for seamless zero-config UI preview
      setMetrics({
        total_recovered_revenue: 184500.0,
        currency: "INR",
        currency_symbol: "₹",
        active_failed_invoices: 14,
        recovery_success_rate: 68.4,
        ongoing_chat_sessions: 9,
        recovered_invoices_count: 24,
        trends: {
          revenue_change_percent: "+18.2%",
          failed_change_percent: "-4.5%",
          rate_change_percent: "+6.8%",
          sessions_change_percent: "+12",
        },
      });
      setTransactions([
        {
          id: "dun_001",
          invoice_id: "inv_001",
          razorpay_invoice_id: "inv_live_hdfc_8921",
          customer_name: "Rahul Sharma",
          customer_email: "rahul.s@techcorp.in",
          customer_phone: "+919820123456",
          amount: 3999,
          currency: "INR",
          failure_code: "INSUFFICIENT_FUNDS",
          failure_reason: "Insufficient balance in HDFC salary account",
          bank: "HDFC",
          card_type: "debit",
          recovery_status: "SMART_RETRY_SCHEDULED",
          channel: "WHATSAPP",
          optimal_retry_window: "Tomorrow at 10:30 AM IST (Post-Salary Settlement)",
          payment_link: "https://rzp.io/i/plink_rec98213a",
          retry_count: 1,
          chat_messages_count: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "dun_002",
          invoice_id: "inv_002",
          razorpay_invoice_id: "inv_live_icici_3412",
          customer_name: "Priya Patel",
          customer_email: "priya.patel@designstudio.co",
          customer_phone: "+919876543210",
          amount: 2499,
          currency: "INR",
          failure_code: "BAD_REQUEST_PAYMENT_TIMED_OUT",
          failure_reason: "ICICI Bank payment gateway timed out",
          bank: "ICICI",
          card_type: "upi",
          recovery_status: "AI_ENGAGED",
          channel: "WHATSAPP",
          optimal_retry_window: "+45 mins (Post-ICICI Network Recovery)",
          retry_count: 1,
          chat_messages_count: 3,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "dun_003",
          invoice_id: "inv_003",
          razorpay_invoice_id: "inv_live_sbi_9981",
          customer_name: "Amit Verma",
          customer_email: "amit.v@logistics.org",
          customer_phone: "+919988776655",
          amount: 1499,
          currency: "INR",
          failure_code: "CARD_EXPIRED",
          failure_reason: "Credit card validity expired (08/26)",
          bank: "SBI",
          card_type: "credit",
          recovery_status: "PAYMENT_LINK_SENT",
          channel: "WHATSAPP",
          optimal_retry_window: "Immediate - Direct Card Update Required",
          payment_link: "https://rzp.io/i/plink_rec98213a",
          retry_count: 0,
          chat_messages_count: 2,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "dun_004",
          invoice_id: "inv_004",
          razorpay_invoice_id: "inv_live_axis_4412",
          customer_name: "Vikram Singh",
          customer_email: "vikram@finscale.ai",
          customer_phone: "+919123456780",
          amount: 8999,
          currency: "INR",
          failure_code: "GATEWAY_ERROR",
          failure_reason: "Axis Bank temporary switch failure",
          bank: "AXIS",
          card_type: "netbanking",
          recovery_status: "RECOVERED",
          channel: "WHATSAPP",
          optimal_retry_window: "+30 mins",
          payment_link: "https://rzp.io/i/plink_vks821",
          retry_count: 1,
          chat_messages_count: 4,
          created_at: new Date(Date.now() - 14400000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 rounded-2xl border border-gray-800/80 bg-gradient-to-r from-gray-900 via-gray-900/90 to-blue-950/40 p-6 shadow-2xl backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Merchant Revenue Recovery Center
            </h1>
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
              Live Production
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
            RecoverFlow AI automatically intercepts Razorpay payment failures, schedules bank-optimized retries, 
            and conducts multi-turn WhatsApp dunning conversations to save recurring revenue.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/simulator"
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-[1.02]"
          >
            <Terminal className="h-4 w-4 text-emerald-300" />
            <span>Open Simulator Playground</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <MetricCards metrics={metrics} isLoading={isLoading} />

      {/* Pipeline Visualizer & Bank Intelligence */}
      <RecoveryFunnel />

      {/* Transactions & Dunning State Machine Table */}
      <TransactionsTable
        transactions={transactions}
        isLoading={isLoading}
        onRefresh={loadData}
      />
    </div>
  );
}

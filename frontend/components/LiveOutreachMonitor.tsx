"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Zap,
  Building,
  CreditCard,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle
} from "lucide-react";
import { SimulatorTriggerResponse, verifyPaymentStatus } from "@/lib/api";

interface LiveOutreachMonitorProps {
  data: SimulatorTriggerResponse | null;
  onRecovered?: () => void;
}

export default function LiveOutreachMonitor({ data, onRecovered }: LiveOutreachMonitorProps) {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const paymentLink = data?.payment_link || "https://rzp.io/rzp/fKH4bht";
  const customerName = data?.customer?.name || "Rahul Sharma";
  const customerPhone = data?.customer?.phone || "+918432184524";
  const amount = data?.amount || 2499;
  const bank = data?.bank || "HDFC";
  const retryWindow = data?.optimal_retry_window || "Tomorrow at 09:30 AM IST (HDFC Clearing)";
  const strategy = data?.strategy || "BANK_CLEARING_WINDOW_RETRY";
  const twilioDispatch = data?.twilio_dispatch;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckStatus = async () => {
    if (!data?.session_id) return;
    try {
      setIsChecking(true);
      setStatusMessage(null);
      const res = await verifyPaymentStatus(data.session_id);
      if (res.is_recovered) {
        setIsSettled(true);
        setStatusMessage("Payment captured and settled via Razorpay! Dunning resolved.");
        if (onRecovered) onRecovered();
      } else {
        setStatusMessage(`Current status: ${res.status}. Payment not yet completed.`);
      }
    } catch (err: any) {
      setStatusMessage(`Verification error: ${err.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 rounded-2xl border border-gray-800/80 bg-gray-950/80 p-6 shadow-2xl backdrop-blur-sm">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800/80 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Production Recovery & WhatsApp Outreach Monitor
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time pipeline tracking: Razorpay Webhook → Smart Retry Matrix → Live WhatsApp Dispatch
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isSettled ? (
            <span className="flex items-center space-x-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>RECOVERED & PAID</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
              <Zap className="h-3 w-3 fill-blue-400" />
              <span>{data ? "LIVE ACTIVE" : "AWAITING WEBHOOK"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Triumphant Banner if Settled */}
      {isSettled && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-300 animate-in fade-in">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>Revenue Successfully Recovered!</span>
          </div>
          <p className="text-xs text-emerald-400/90 mt-1">
            Payment of ₹{amount.toLocaleString("en-IN")} was verified via Razorpay API. Subscription access has been maintained.
          </p>
        </div>
      )}

      {/* CARD 1: Official Razorpay 1-Click Settlement Link */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white">Razorpay 1-Click Settlement Link</span>
              <p className="text-[10px] text-gray-400">Official UPI / GPay / Netbanking payment link</p>
            </div>
          </div>
          <span className="text-sm font-extrabold text-emerald-400">
            ₹{amount.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Live URL Pill & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex-1 truncate rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-mono text-gray-300">
            {paymentLink}
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center space-x-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
          >
            <span>Open Payment Link</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* CARD 2: Real Twilio WhatsApp Outreach Delivery */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white">Live WhatsApp Outreach</span>
              <p className="text-[10px] text-gray-400">Delivered via Twilio WhatsApp API</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-gray-300">
              {customerPhone}
            </span>
            {twilioDispatch?.success ? (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                SENT
              </span>
            ) : twilioDispatch?.mode === "live" ? (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                LIVE DISPATCH
              </span>
            ) : (
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/30">
                ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Formatted Message Sent to WhatsApp */}
        <div className="rounded-lg border border-gray-800/80 bg-[#0b141a] p-3 text-xs text-gray-200 shadow-inner font-sans space-y-1.5">
          <div className="text-[10px] font-semibold text-emerald-400/90 uppercase tracking-wider">
            WhatsApp Outbound Message Payload:
          </div>
          <div className="whitespace-pre-line leading-relaxed text-gray-300 text-[11px] bg-gray-900/50 p-2.5 rounded border border-gray-800">
            {data?.initial_greeting || (
              `Hi ${customerName}! 👋 RecoverFlow AI Alert\n\n` +
              `We noticed your subscription renewal of ₹${amount.toLocaleString("en-IN")}.00 ` +
              `could not be completed due to a temporary bank timeout (${bank}).\n\n` +
              `Your access remains active! Settle instantly via UPI or Card:\n` +
              `👉 ${paymentLink}\n\n` +
              `Optimal Bank Retry Window: ${retryWindow}`
            )}
          </div>

          {twilioDispatch?.sid && (
            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 font-mono">
              <span>Twilio Message SID: {twilioDispatch.sid}</span>
              <span className="text-emerald-400">Encrypted • 256-bit</span>
            </div>
          )}
        </div>
      </div>

      {/* CARD 3: Indian Banking Settlement Intelligence */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white">Smart Bank Clearing Matrix</span>
              <p className="text-[10px] text-gray-400">Indian banking clearing windows & NACH schedule</p>
            </div>
          </div>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-bold text-white border border-gray-700">
            {bank} Bank
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-gray-950/80 p-2.5 border border-gray-800">
            <div className="text-[10px] text-gray-400 font-medium">Optimal Clearing Window</div>
            <div className="text-xs font-semibold text-blue-300 mt-0.5 flex items-center space-x-1">
              <Clock className="h-3 w-3 text-blue-400" />
              <span>{retryWindow}</span>
            </div>
          </div>

          <div className="rounded-lg bg-gray-950/80 p-2.5 border border-gray-800">
            <div className="text-[10px] text-gray-400 font-medium">Recovery Strategy</div>
            <div className="text-xs font-semibold text-emerald-300 mt-0.5">
              {strategy}
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: Real-time Status Verification */}
      <div className="mt-auto pt-2">
        <button
          onClick={handleCheckStatus}
          disabled={!data?.session_id || isChecking}
          className="w-full flex items-center justify-center space-x-2 rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 text-xs font-bold text-white hover:border-gray-600 hover:from-gray-800 hover:to-gray-700 transition-all shadow-md disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin text-blue-400" : ""}`} />
          <span>{isChecking ? "Querying Razorpay Settlement..." : "Check Real Razorpay Payment Status"}</span>
        </button>

        {statusMessage && (
          <p className="text-center text-[11px] text-gray-400 mt-2 font-medium">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}

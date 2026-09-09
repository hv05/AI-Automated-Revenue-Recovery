"use client";

import React, { useState } from "react";
import { 
  Terminal, 
  Send, 
  Sparkles, 
  Code, 
  CheckCircle, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Building,
  User,
  Zap
} from "lucide-react";
import { triggerFailureSimulation, SimulatorTriggerResponse } from "@/lib/api";

interface WebhookSimulatorFormProps {
  onSuccess: (data: SimulatorTriggerResponse) => void;
}

const PRESETS = [
  {
    name: "HDFC Debit — Insufficient Funds",
    customer_name: "Rahul Sharma",
    customer_email: "rahul.sharma@techcorp.in",
    customer_phone: "+918432184524",
    amount: 2499,
    card_type: "debit",
    bank: "HDFC",
    failure_code: "INSUFFICIENT_FUNDS",
    failure_reason: "Payment failed due to insufficient funds in customer account.",
    plan_name: "Pro Developer Monthly",
  },
  {
    name: "ICICI UPI — Bank Timeout",
    customer_name: "Priya Patel",
    customer_email: "priya.p@designstudio.co",
    customer_phone: "+918432184524",
    amount: 1899,
    card_type: "upi",
    bank: "ICICI",
    failure_code: "BAD_REQUEST_PAYMENT_TIMED_OUT",
    failure_reason: "ICICI UPI gateway response timed out after 30 seconds.",
    plan_name: "Growth Tier Subscription",
  },
  {
    name: "SBI Credit — Card Expired",
    customer_name: "Amit Verma",
    customer_email: "amit.v@logistics.org",
    customer_phone: "+918432184524",
    amount: 3499,
    card_type: "credit",
    bank: "SBI",
    failure_code: "CARD_EXPIRED",
    failure_reason: "Customer credit card validity expired (08/26).",
    plan_name: "Enterprise Annual Plan",
  },
  {
    name: "Axis Bank — Transient Failure",
    customer_name: "Vikram Singh",
    customer_email: "vikram.s@startup.io",
    customer_phone: "+918432184524",
    amount: 4999,
    card_type: "debit",
    bank: "AXIS",
    failure_code: "GATEWAY_ERROR",
    failure_reason: "Temporary inter-bank payment switch communication failure.",
    plan_name: "Scale Plan",
  },
];

export default function WebhookSimulatorForm({ onSuccess }: WebhookSimulatorFormProps) {
  const [formData, setFormData] = useState(PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDispatched, setLastDispatched] = useState<SimulatorTriggerResponse | null>(null);
  const [showPayload, setShowPayload] = useState(true);

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setFormData(preset);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await triggerFailureSimulation(formData);
      setLastDispatched(res);
      onSuccess(res);
    } catch (err: any) {
      alert(`Webhook error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5 rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
              <Terminal className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-bold text-white">Razorpay Webhook Dispatcher</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Trigger simulated <code className="text-rose-400 bg-gray-950 px-1 py-0.5 rounded">payment.failed</code> events with HMAC SHA-256 verification
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
          Sandbox Ready
        </span>
      </div>

      {/* Preset Buttons */}
      <div>
        <label className="text-xs font-semibold text-gray-300 block mb-2">
          Scenario Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetSelect(p)}
              className={`text-left rounded-xl p-2.5 text-xs transition-all border ${
                formData.name === p.name
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold"
                  : "bg-gray-950/60 border-gray-800/60 text-gray-300 hover:bg-gray-800/60"
              }`}
            >
              <div className="font-medium text-white">{p.name}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">₹{p.amount.toLocaleString("en-IN")} • {p.bank}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer Name */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 block mb-1">Customer Name</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Customer Email */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 block mb-1">Customer Email</label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Customer Phone (WhatsApp) */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 block mb-1">
              Customer Phone <span className="text-emerald-400 font-semibold">(WhatsApp Target)</span>
            </label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              placeholder="+918432184524"
              required
            />
          </div>

          {/* Amount (₹) */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 block mb-1">Amount (INR ₹)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Bank */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 block mb-1">Issuing Bank</label>
            <select
              value={formData.bank}
              onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="HDFC">HDFC Bank</option>
              <option value="ICICI">ICICI Bank</option>
              <option value="SBI">State Bank of India (SBI)</option>
              <option value="AXIS">Axis Bank</option>
              <option value="KOTAK">Kotak Mahindra Bank</option>
            </select>
          </div>

          {/* Card / Rail Type */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 block mb-1">Payment Rail</label>
            <select
              value={formData.card_type}
              onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="debit">Debit Card (Salary/Savings)</option>
              <option value="credit">Credit Card</option>
              <option value="upi">UPI AutoPay / Mandate</option>
            </select>
          </div>

          {/* Failure Code */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 block mb-1">Failure Code</label>
            <select
              value={formData.failure_code}
              onChange={(e) => setFormData({ ...formData, failure_code: e.target.value })}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS</option>
              <option value="BAD_REQUEST_PAYMENT_TIMED_OUT">BAD_REQUEST_PAYMENT_TIMED_OUT</option>
              <option value="CARD_EXPIRED">CARD_EXPIRED</option>
              <option value="GATEWAY_ERROR">GATEWAY_ERROR</option>
              <option value="DO_NOT_HONOR">DO_NOT_HONOR</option>
            </select>
          </div>
        </div>

        {/* Failure Reason */}
        <div>
          <label className="text-[11px] font-medium text-gray-400 block mb-1">Error Description</label>
          <input
            type="text"
            value={formData.failure_reason}
            onChange={(e) => setFormData({ ...formData, failure_reason: e.target.value })}
            className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50"
        >
          <Zap className="h-4 w-4 fill-white" />
          <span>{isSubmitting ? "Processing Webhook & Scheduling Engine..." : "Fire Razorpay Webhook Event"}</span>
        </button>
      </form>

      {/* Webhook Payload & Signature Inspector */}
      {lastDispatched && (
        <div className="rounded-xl border border-gray-800 bg-gray-950/80 p-4 text-xs">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowPayload(!showPayload)}
          >
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-white">Webhook Payload & Signature Verified</span>
            </div>
            {showPayload ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>

          {showPayload && (
            <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
              <div>
                <span className="text-[10px] text-gray-400 font-mono">X-Razorpay-Signature (HMAC SHA-256):</span>
                <div className="font-mono text-[11px] text-emerald-400 truncate bg-gray-900 px-2 py-1 rounded border border-gray-800 mt-0.5">
                  {lastDispatched.webhook_details.signature}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-mono">Calculated Recovery Strategy:</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="rounded bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 text-[11px] border border-blue-500/30">
                    {lastDispatched.strategy}
                  </span>
                  <span className="text-gray-300 text-[11px]">
                    Window: {lastDispatched.optimal_retry_window}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

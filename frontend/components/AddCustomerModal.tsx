"use client";

import React, { useState } from "react";
import { 
  X, 
  UserPlus, 
  CheckCircle2, 
  CreditCard, 
  Building, 
  Phone, 
  Mail, 
  AlertTriangle,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { createManualCustomer, ManualCustomerPayload } from "@/lib/api";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_FORM: ManualCustomerPayload = {
  customer_name: "",
  customer_email: "",
  customer_phone: "+918432184524",
  plan_name: "Pro Developer Monthly",
  amount: 2499,
  bank: "HDFC",
  card_type: "debit",
  failure_code: "INSUFFICIENT_FUNDS",
  failure_reason: "Payment declined due to temporary insufficient funds in customer bank account.",
};

const BANK_OPTIONS = [
  { value: "HDFC", label: "HDFC Bank" },
  { value: "ICICI", label: "ICICI Bank" },
  { value: "SBI", label: "State Bank of India (SBI)" },
  { value: "AXIS", label: "Axis Bank" },
  { value: "KOTAK", label: "Kotak Mahindra Bank" },
  { value: "YES_BANK", label: "Yes Bank" },
];

const FAILURE_PRESETS: Record<string, string> = {
  INSUFFICIENT_FUNDS: "Payment declined due to temporary insufficient funds in customer bank account.",
  BAD_REQUEST_PAYMENT_TIMED_OUT: "Payment gateway timed out during inter-bank communication.",
  CARD_EXPIRED: "Customer credit/debit card expired or invalid expiry date.",
  GATEWAY_ERROR: "Temporary switch failure at issuing bank gateway.",
  DO_NOT_HONOR: "Issuing bank declined transaction without specific reason code.",
};

export default function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomerModalProps) {
  const [formData, setFormData] = useState<ManualCustomerPayload>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFailureCodeChange = (code: string) => {
    setFormData({
      ...formData,
      failure_code: code,
      failure_reason: FAILURE_PRESETS[code] || formData.failure_reason,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.customer_email.trim()) {
      setError("Please fill in customer name and email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await createManualCustomer(formData);
      setCreatedResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create customer record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCreatedResult(null);
    setFormData(DEFAULT_FORM);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-gray-800/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Add Customer Manually
            </h2>
            <p className="text-xs text-gray-400">
              Create customer, log failed payment, generate payment recovery link & trigger WhatsApp outreach
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Success View */}
        {createdResult ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Customer Added & Dunning Session Initialized!</span>
              </div>
              <p className="text-xs text-emerald-400/90 mt-1">
                Customer <strong>{createdResult.customer?.name}</strong> has been saved. Optimal retry window: <strong>{createdResult.optimal_retry_window}</strong>.
              </p>
            </div>

            {/* Generated Payment Link */}
            {createdResult.payment_link && (
              <div className="rounded-xl border border-gray-800 bg-gray-950/80 p-3.5 space-y-2">
                <span className="text-[11px] font-semibold text-gray-300">Secure Payment Recovery Link:</span>
                <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-400">
                  <span className="truncate font-mono">{createdResult.payment_link}</span>
                  <a
                    href={createdResult.payment_link}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 flex items-center space-x-1 shrink-0 rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-500"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* 1-Click WhatsApp Direct Link */}
            {createdResult.direct_whatsapp_url && (
              <div className="rounded-xl border border-gray-800 bg-[#0b141a] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                    <MessageSquare className="h-4 w-4" />
                    <span>Direct WhatsApp Delivery Link</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{createdResult.customer?.phone}</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Click below to open WhatsApp Web or App with the pre-filled message and payment link:
                </p>
                <a
                  href={createdResult.direct_whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center space-x-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/30"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Send Real WhatsApp Message Now</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-3 border-t border-gray-800">
              <button
                onClick={handleResetAndClose}
                className="rounded-xl bg-gray-800 hover:bg-gray-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Close & View in Tracker
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Customer Details */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                1. Customer Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Customer Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul.sharma@example.com"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Customer Phone (WhatsApp Target with Country Code) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <input
                      type="tel"
                      required
                      placeholder="+918432184524"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full rounded-xl border border-gray-800 bg-gray-950/80 pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Real WhatsApp messages will be prepared and sent to this phone number.
                  </p>
                </div>
              </div>
            </div>

            {/* Plan & Amount Details */}
            <div className="space-y-3 pt-2 border-t border-gray-800/60">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                2. Subscription & Invoice Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Subscription Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pro Developer Plan"
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Amount (INR ₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Issuing Bank
                  </label>
                  <select
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    {BANK_OPTIONS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Payment Rail
                  </label>
                  <select
                    value={formData.card_type}
                    onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="debit">Debit Card</option>
                    <option value="credit">Credit Card</option>
                    <option value="upi">UPI AutoPay / Mandate</option>
                    <option value="netbanking">Net Banking</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Failure Diagnostics */}
            <div className="space-y-3 pt-2 border-t border-gray-800/60">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                3. Payment Failure Diagnostics
              </span>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Failure Code
                  </label>
                  <select
                    value={formData.failure_code}
                    onChange={(e) => handleFailureCodeChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS</option>
                    <option value="BAD_REQUEST_PAYMENT_TIMED_OUT">BAD_REQUEST_PAYMENT_TIMED_OUT</option>
                    <option value="CARD_EXPIRED">CARD_EXPIRED</option>
                    <option value="GATEWAY_ERROR">GATEWAY_ERROR</option>
                    <option value="DO_NOT_HONOR">DO_NOT_HONOR</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-300 block mb-1">
                    Failure Reason / Error Message
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.failure_reason}
                    onChange={(e) => setFormData({ ...formData, failure_reason: e.target.value })}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-800">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-2 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isSubmitting ? "Creating & Generating Links..." : "Save Customer & Launch Outreach"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

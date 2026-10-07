"use client";

import React, { useState } from "react";
import { 
  Search, 
  ExternalLink, 
  RefreshCw, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle,
  CreditCard,
  Building,
  User,
  X,
  Trash2,
  UserPlus,
  Check,
  AlertCircle
} from "lucide-react";
import { 
  TransactionItem, 
  triggerManualRetry, 
  deleteTransaction, 
  verifyPaymentStatus 
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import AddCustomerModal from "@/components/AddCustomerModal";

interface TransactionsTableProps {
  transactions: TransactionItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenSessionModal?: (sessionId: string) => void;
}

export default function TransactionsTable({
  transactions,
  isLoading,
  onRefresh,
}: TransactionsTableProps) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<TransactionItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [verifyingSessionId, setVerifyingSessionId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const filterTabs = [
    { label: "All Invoices", value: "ALL" },
    { label: "Smart Retry Scheduled", value: "SMART_RETRY_SCHEDULED" },
    { label: "AI Engaged", value: "AI_ENGAGED" },
    { label: "Payment Link Sent", value: "PAYMENT_LINK_SENT" },
    { label: "Recovered", value: "RECOVERED" },
  ];

  const filtered = transactions.filter((t) => {
    if (statusFilter !== "ALL" && t.recovery_status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.customer_name || "").toLowerCase().includes(q) ||
      (t.customer_email || "").toLowerCase().includes(q) ||
      (t.razorpay_invoice_id || "").toLowerCase().includes(q) ||
      (t.bank || "").toLowerCase().includes(q) ||
      (t.failure_reason || "").toLowerCase().includes(q)
    );
  });

  const handleManualRetry = async (sessionId: string) => {
    try {
      setRetryingId(sessionId);
      await triggerManualRetry(sessionId);
      alert("Manual Razorpay retry triggered successfully!");
      onRefresh();
    } catch (e: any) {
      alert(`Retry failed: ${e.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      setDeletingId(sessionId);
      await deleteTransaction(sessionId);
      setConfirmDeleteId(null);
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleVerifyStatus = async (sessionId: string) => {
    try {
      setVerifyingSessionId(sessionId);
      setVerificationFeedback(null);
      const res = await verifyPaymentStatus(sessionId);
      if (res.is_recovered) {
        setVerificationFeedback("Payment settled! Invoice marked as RECOVERED.");
        onRefresh();
        if (selectedSession && selectedSession.id === sessionId) {
          setSelectedSession({
            ...selectedSession,
            recovery_status: "RECOVERED",
          });
        }
      } else {
        setVerificationFeedback(`Current status: ${res.status}. Payment not yet settled.`);
      }
    } catch (err: any) {
      setVerificationFeedback(`Verification error: ${err.message}`);
    } finally {
      setVerifyingSessionId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECOVERED":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Recovered</span>
          </span>
        );
      case "SMART_RETRY_SCHEDULED":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
            <Clock className="h-3.5 w-3.5" />
            <span>Smart Retry Scheduled</span>
          </span>
        );
      case "AI_ENGAGED":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400 border border-purple-500/20">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>AI Agent Engaged</span>
          </span>
        );
      case "PAYMENT_LINK_SENT":
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Payment Link Sent</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Failed</span>
          </span>
        );
    }
  };

  const getDirectWhatsAppUrl = (phone?: string, name?: string, amount?: number, link?: string) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const msg = `Hi ${name || "Customer"}! Your subscription payment of ₹${amount || 2499} needs renewal. Settle securely via Razorpay: ${link || "https://rzp.io/rzp/fKH4bht"}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 shadow-xl backdrop-blur-sm">
      {/* Table Header & Controls */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-5 border-b border-gray-800/60">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Failed Payments & Dunning Tracker</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time tracking of failed Razorpay subscriptions, dunning state machine, and customer recovery history
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, bank, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-44 sm:w-56 rounded-xl border border-gray-800 bg-gray-950/80 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Add Customer Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex h-9 items-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-[1.02]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex h-9 items-center space-x-1.5 rounded-xl border border-gray-800 bg-gray-950/80 px-3 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto py-4 border-b border-gray-800/40 text-xs">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 font-medium transition-all ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-gray-950/60 text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 border border-gray-800/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-800/60 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <th className="py-3.5 px-4">Customer & Account</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">Bank & Reason</th>
              <th className="py-3.5 px-4">Recovery Status</th>
              <th className="py-3.5 px-4">Optimal Retry Window</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="py-4 px-4">
                    <div className="h-6 rounded bg-gray-800/50 w-full" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-800/40 text-gray-500 mb-3">
                    <Search className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">No failed transactions found</p>
                  <p className="text-xs text-gray-500 mt-1">Add a new customer manually or dispatch a mock failure from the simulator.</p>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-800/30 transition-colors group cursor-pointer"
                  onClick={() => setSelectedSession(t)}
                >
                  {/* Customer with Delete Option Button Directly In Front of Customer Name */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2.5">
                      {/* Delete Option Button right in front of customer name */}
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center space-x-1">
                        {confirmDeleteId === t.id ? (
                          <div className="flex items-center space-x-1 bg-rose-950/80 border border-rose-500/40 rounded-lg p-1 animate-in fade-in">
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={deletingId === t.id}
                              title="Confirm Delete Customer"
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white transition-colors"
                            >
                              {deletingId === t.id ? "..." : "Delete"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 rounded text-gray-400 hover:text-white text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            title="Delete customer history"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all opacity-80 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Customer Avatar & Name */}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-xs shrink-0">
                        {(t.customer_name || "C").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                          {t.customer_name || "Customer"}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{t.customer_email || "—"}</div>
                      </div>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="py-4 px-4 font-bold text-white text-sm whitespace-nowrap">
                    {formatCurrency(t.amount, t.currency)}
                  </td>

                  {/* Bank & Reason */}
                  <td className="py-4 px-4 max-w-[240px]">
                    <div className="flex items-center space-x-1.5 text-gray-300">
                      <Building className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="font-medium text-white">{t.bank || "Bank"}</span>
                      <span className="text-gray-500 text-[10px]">({(t.card_type || "Card").toUpperCase()})</span>
                    </div>
                    <div className="truncate text-[11px] text-gray-400 mt-0.5" title={t.failure_reason}>
                      {t.failure_reason}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {getStatusBadge(t.recovery_status)}
                  </td>

                  {/* Optimal Retry Window */}
                  <td className="py-4 px-4 text-[11px] text-gray-300 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span className="font-medium">{t.optimal_retry_window || "Immediate"}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Retries so far: {t.retry_count}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-2">
                      {/* Direct WhatsApp link */}
                      {t.customer_phone && (
                        <a
                          href={getDirectWhatsAppUrl(t.customer_phone, t.customer_name, t.amount, t.payment_link) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          title="Open WhatsApp chat with customer"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => setSelectedSession(t)}
                        className="rounded-lg border border-gray-800 bg-gray-950/80 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        Inspect
                      </button>

                      {t.recovery_status !== "RECOVERED" && (
                        <button
                          onClick={() => handleManualRetry(t.id)}
                          disabled={retryingId === t.id}
                          className="rounded-lg bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                        >
                          {retryingId === t.id ? "Retrying..." : "Retry"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* Session Detail Modal / Drawer */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setSelectedSession(null);
                setVerificationFeedback(null);
              }}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold">
                {(selectedSession.customer_name || "C").charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{selectedSession.customer_name || "Customer"}</h3>
                <p className="text-xs text-gray-400">{selectedSession.customer_phone || "—"} • {selectedSession.customer_email || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-800 bg-gray-950/60 p-4 text-xs mb-4">
              <div>
                <span className="text-gray-400">Invoice Amount</span>
                <p className="text-sm font-bold text-white mt-0.5">{formatCurrency(selectedSession.amount, selectedSession.currency)}</p>
              </div>
              <div>
                <span className="text-gray-400">Current Status</span>
                <p className="mt-0.5">{getStatusBadge(selectedSession.recovery_status)}</p>
              </div>
              <div>
                <span className="text-gray-400">Payment Rail</span>
                <p className="font-medium text-gray-200 mt-0.5">{selectedSession.bank || "Bank"} ({(selectedSession.card_type || "Card").toUpperCase()})</p>
              </div>
              <div>
                <span className="text-gray-400">Optimal Retry Window</span>
                <p className="font-medium text-blue-400 mt-0.5">{selectedSession.optimal_retry_window}</p>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-xs font-semibold text-gray-300">Failure Diagnostics (Razorpay Error)</span>
              <p className="mt-1 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                {selectedSession.failure_reason} (Code: {selectedSession.failure_code})
              </p>
            </div>

            {selectedSession.payment_link && (
              <div className="mb-4">
                <span className="text-xs font-semibold text-gray-300">Generated Razorpay Recovery Link</span>
                <a
                  href={selectedSession.payment_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-400 hover:underline"
                >
                  <span className="truncate">{selectedSession.payment_link}</span>
                  <ExternalLink className="h-4 w-4 ml-2 shrink-0" />
                </a>
              </div>
            )}

            {/* Direct WhatsApp Action */}
            {selectedSession.customer_phone && (
              <div className="mb-4">
                <a
                  href={getDirectWhatsAppUrl(selectedSession.customer_phone, selectedSession.customer_name, selectedSession.amount, selectedSession.payment_link) || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center space-x-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/30"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Send Real WhatsApp Message to {selectedSession.customer_phone}</span>
                </a>
              </div>
            )}

            {/* Check Payment Settlement Status */}
            <div className="mb-4">
              <button
                onClick={() => handleVerifyStatus(selectedSession.id)}
                disabled={verifyingSessionId === selectedSession.id}
                className="w-full flex items-center justify-center space-x-2 rounded-xl border border-gray-700 bg-gray-800/80 hover:bg-gray-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${verifyingSessionId === selectedSession.id ? "animate-spin text-blue-400" : ""}`} />
                <span>
                  {verifyingSessionId === selectedSession.id ? "Checking Razorpay Settlement..." : "Check Real Razorpay Payment Status"}
                </span>
              </button>
              {verificationFeedback && (
                <p className="text-center text-[11px] text-gray-300 mt-1.5 font-medium">
                  {verificationFeedback}
                </p>
              )}
            </div>

            {/* Delete Customer Button in modal */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <button
                onClick={() => handleDelete(selectedSession.id)}
                disabled={deletingId === selectedSession.id}
                className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 hover:underline transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deletingId === selectedSession.id ? "Deleting..." : "Delete Customer Record"}</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

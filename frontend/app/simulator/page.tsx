"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Terminal, Sparkles, ShieldCheck, Zap } from "lucide-react";
import WebhookSimulatorForm from "@/components/WebhookSimulatorForm";
import LiveOutreachMonitor from "@/components/LiveOutreachMonitor";
import { SimulatorTriggerResponse } from "@/lib/api";

export default function SimulatorPage() {
  const [dispatchedData, setDispatchedData] = useState<SimulatorTriggerResponse | null>(null);
  const [recoveryNotified, setRecoveryNotified] = useState(false);

  const handleWebhookSuccess = (data: SimulatorTriggerResponse) => {
    setDispatchedData(data);
    setRecoveryNotified(false);
  };

  const handleRecovered = () => {
    setRecoveryNotified(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Payment Failure Dispatcher & Recovery Monitor
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                Production Ready
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Simulate or dispatch Razorpay payment failures on the left, monitor real-time WhatsApp outreach, 1-click settlement links, and bank clearing retries on the right.
            </p>
          </div>
        </div>

        {recoveryNotified && (
          <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 animate-in fade-in">
            <Sparkles className="h-4 w-4" />
            <span>Revenue Successfully Recovered & Settled!</span>
          </div>
        )}
      </div>

      {/* Split Screen Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Webhook Simulator Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <WebhookSimulatorForm onSuccess={handleWebhookSuccess} />
        </div>

        {/* Right Column: Production Live Outreach & Recovery Monitor (7 cols) */}
        <div className="lg:col-span-7">
          <LiveOutreachMonitor
            data={dispatchedData}
            onRecovered={handleRecovered}
          />
        </div>
      </div>
    </div>
  );
}


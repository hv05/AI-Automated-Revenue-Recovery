"use client";

import React from "react";
import { Zap, Clock, MessageSquare, CheckCircle2, ShieldAlert, ChevronRight } from "lucide-react";

export default function RecoveryFunnel() {
  const steps = [
    {
      title: "1. Webhook Intercepted",
      desc: "Razorpay payment.failed validated with HMAC SHA-256",
      stat: "100%",
      sub: "Zero drops",
      icon: ShieldAlert,
      color: "border-rose-500/40 text-rose-400 bg-rose-500/10",
    },
    {
      title: "2. Smart Routing",
      desc: "Bank settlement & salary date clearing calculated",
      stat: "82.4%",
      sub: "Optimized window",
      icon: Clock,
      color: "border-blue-500/40 text-blue-400 bg-blue-500/10",
    },
    {
      title: "3. AI Agent Engaged",
      desc: "Interactive WhatsApp outreach resolving objections",
      stat: "74.1%",
      sub: "Conversational rate",
      icon: MessageSquare,
      color: "border-purple-500/40 text-purple-400 bg-purple-500/10",
    },
    {
      title: "4. Revenue Recovered",
      desc: "Direct 1-click UPI links & successful smart retries",
      stat: "68.4%",
      sub: "Recovered ARR",
      icon: CheckCircle2,
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    },
  ];

  const banks = [
    { name: "HDFC Bank", recovery: "78%", delay: "Next Morning 10:30 AM", status: "Salary Window High" },
    { name: "ICICI Bank", recovery: "72%", delay: "+45m Exponential Backoff", status: "Transient Fixed" },
    { name: "SBI", recovery: "64%", delay: "Evening 04:00 PM Batch", status: "Clearing Cycle" },
    { name: "Axis Bank", recovery: "69%", delay: "+30m Gateway Micro-Retry", status: "Active Switch" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Recovery Funnel Pipeline */}
      <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 backdrop-blur-sm lg:col-span-2">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800/60">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-400" />
              <span>Intelligent Revenue Recovery Pipeline</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Automated multi-stage failure interception and resolution funnel
            </p>
          </div>
          <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
            Real-Time Engine
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative flex flex-col justify-between rounded-xl border border-gray-800/80 bg-gray-950/50 p-4 transition-all hover:border-gray-700/60"
              >
                <div>
                  <div className={`mb-3 inline-flex rounded-lg border p-2 ${s.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-200">{s.title}</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{s.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-800/50 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-white">{s.stat}</span>
                  <span className="text-[10px] text-gray-400">{s.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indian Banking Settlement Performance */}
      <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800/60">
          <div>
            <h3 className="text-base font-semibold text-white">Bank Clearing Profiles</h3>
            <p className="text-xs text-gray-400 mt-0.5">Automated retry window mapping</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {banks.map((b, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-gray-800/60 bg-gray-950/40 p-3"
            >
              <div>
                <div className="text-xs font-semibold text-white">{b.name}</div>
                <div className="text-[10px] text-gray-400">{b.delay}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">{b.recovery}</span>
                <div className="text-[10px] text-gray-500">{b.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

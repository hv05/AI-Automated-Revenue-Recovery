"use client";

import React from "react";
import { DollarSign, AlertCircle, CheckCircle2, MessageSquare, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { DashboardMetrics } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface MetricCardsProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
}

export default function MetricCards({ metrics, isLoading }: MetricCardsProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Recovered Revenue",
      value: formatCurrency(metrics.total_recovered_revenue, metrics.currency),
      subtext: `${metrics.recovered_invoices_count} invoices recovered`,
      change: metrics.trends.revenue_change_percent,
      isPositive: true,
      icon: DollarSign,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      badge: "Automated ARR",
    },
    {
      title: "Active Failed Invoices",
      value: metrics.active_failed_invoices.toString(),
      subtext: "Under active recovery",
      change: metrics.trends.failed_change_percent,
      isPositive: true, // Decreasing failed is positive
      icon: AlertCircle,
      color: "from-rose-500/20 to-orange-500/20 text-rose-400 border-rose-500/30",
      badge: "In Pipeline",
    },
    {
      title: "Recovery Success Rate",
      value: `${metrics.recovery_success_rate}%`,
      subtext: "Industry benchmark: 35%",
      change: metrics.trends.rate_change_percent,
      isPositive: true,
      icon: CheckCircle2,
      color: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30",
      badge: "+2.1x Baseline",
    },
    {
      title: "Ongoing AI Dunning Sessions",
      value: metrics.ongoing_chat_sessions.toString(),
      subtext: "WhatsApp & SMS channels",
      change: metrics.trends.sessions_change_percent,
      isPositive: true,
      icon: MessageSquare,
      color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
      badge: "Active AI",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="relative overflow-hidden rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 shadow-xl backdrop-blur-sm transition-all duration-200 hover:border-gray-700/80 hover:translate-y-[-2px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{card.title}</span>
              <span className="rounded-full bg-gray-800/80 px-2 py-0.5 text-[10px] font-medium text-gray-300 border border-gray-700/50">
                {card.badge}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
                {card.value}
              </div>
              <div
                className={`flex items-center space-x-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                  card.isPositive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {card.isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 mr-0.5" />
                )}
                <span>{card.change}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-800/60 pt-3 text-xs text-gray-400">
              <span>{card.subtext}</span>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

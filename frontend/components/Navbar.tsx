"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Activity, Terminal, ExternalLink, Zap } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0b0f17]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white">RecoverFlow</span>
                <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Razorpay Revenue Recovery Engine</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "bg-gray-800/80 text-blue-400 border border-gray-700/60"
                  : "text-gray-300 hover:text-white hover:bg-gray-800/40"
              }`}
            >
              Merchant Dashboard
            </Link>
            <Link
              href="/simulator"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                pathname === "/simulator"
                  ? "bg-gray-800/80 text-blue-400 border border-gray-700/60"
                  : "text-gray-300 hover:text-white hover:bg-gray-800/40"
              }`}
            >
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>Simulator Playground</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 rounded-full border border-gray-800 bg-gray-900/80 px-3 py-1 text-xs text-gray-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Razorpay Webhooks Active</span>
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            <span>FastAPI Docs</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

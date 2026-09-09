"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Terminal } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console
    console.error("RecoverFlow UI Caught Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-800 bg-gray-900/90 p-8 shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-5">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          Something went wrong
        </h2>
        
        <p className="mt-2 text-xs text-gray-400 leading-relaxed">
          {error?.message || "An unexpected error occurred while rendering the recovery dashboard."}
        </p>

        {error?.digest && (
          <div className="mt-3 rounded-lg bg-gray-950 px-3 py-1.5 font-mono text-[10px] text-gray-500">
            Digest ID: {error.digest}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center space-x-2 w-full sm:w-auto rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center space-x-2 w-full sm:w-auto rounded-xl border border-gray-800 bg-gray-950 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

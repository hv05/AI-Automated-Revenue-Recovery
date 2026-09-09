"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  CheckCheck, 
  Shield, 
  ExternalLink, 
  PauseCircle, 
  Calendar, 
  Sparkles, 
  CreditCard,
  Phone,
  Video,
  MoreVertical,
  CheckCircle2,
  RefreshCcw,
  Zap
} from "lucide-react";
import { ChatMessage, sendChatMessage, simulateSuccess } from "@/lib/api";

interface WhatsAppChatPreviewProps {
  sessionId?: string;
  customerName?: string;
  customerPhone?: string;
  initialChat?: ChatMessage[];
  paymentLink?: string;
  onRecovered?: () => void;
}

const QUICK_OBJECTIONS = [
  "Can you pause my subscription for 3 days?",
  "Send me a UPI link to pay right now",
  "Why did the payment fail?",
  "Please retry next Friday after my salary clears",
];

export default function WhatsAppChatPreview({
  sessionId,
  customerName = "Rahul Sharma",
  customerPhone = "+91 98201 23456",
  initialChat = [],
  paymentLink,
  onRecovered,
}: WhatsAppChatPreviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChat);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activePaymentLink, setActivePaymentLink] = useState<string | undefined>(paymentLink);
  const [isRecovered, setIsRecovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialChat && initialChat.length > 0) {
      setMessages(initialChat);
    }
  }, [initialChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !sessionId || isTyping) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      role: "customer",
      message: text,
      timestamp: time,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const res = await sendChatMessage(sessionId, text);
      if (res.payment_link) {
        setActivePaymentLink(res.payment_link);
      }
      setMessages(res.chat_history);
      if (res.status === "RECOVERED") {
        setIsRecovered(true);
        if (onRecovered) onRecovered();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          message: `Network glitch: ${err.message}. Please try again.`,
          timestamp: time,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSimulatePaid = async () => {
    if (!sessionId) return;
    try {
      setIsTyping(true);
      const res = await simulateSuccess(sessionId);
      setMessages(res.chat_history);
      setIsRecovered(true);
      if (onRecovered) onRecovered();
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[680px] rounded-2xl border border-gray-800/80 bg-gray-950/80 shadow-2xl overflow-hidden">
      {/* WhatsApp Header */}
      <div className="flex items-center justify-between bg-[#1f2c34] px-4 py-3 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 font-bold text-white shadow">
              {customerName.charAt(0)}
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#1f2c34]" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-sm text-white">{customerName}</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium">
              online • RecoverFlow AI Dunning Agent
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-gray-300">
          {sessionId && (
            <button
              onClick={handleSimulatePaid}
              disabled={isRecovered}
              className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                isRecovered
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30"
              }`}
              title="Simulate customer completing payment via UPI/Card link"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isRecovered ? "Recovered!" : "Simulate Customer Paid"}</span>
            </button>
          )}
          <MoreVertical className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* WhatsApp Chat Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0b141a]/95 bg-opacity-95">
        {/* Security Notice */}
        <div className="mx-auto max-w-xs rounded-lg bg-[#182229] px-3 py-1.5 text-center text-[10px] text-amber-300/80 border border-amber-500/20 shadow-sm">
          🔒 Messages are secured with 256-bit Razorpay Merchant & PCI-DSS encryption
        </div>

        {/* Empty state if no session */}
        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
            <Zap className="h-10 w-10 text-gray-600 mb-2 animate-bounce" />
            <p className="text-xs font-medium text-gray-400">Ready to simulate recovery chat</p>
            <p className="text-[11px] text-gray-600 max-w-xs mt-1">
              Select a preset on the left and click &quot;Fire Razorpay Webhook Event&quot; to initiate the AI dunning outreach.
            </p>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((m, idx) => {
          const isAgent = m.role === "agent";
          return (
            <div
              key={idx}
              className={`flex flex-col ${isAgent ? "items-start" : "items-end"}`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                  isAgent
                    ? "bg-[#202c33] text-gray-100 rounded-tl-sm border border-gray-700/40"
                    : "bg-[#005c4b] text-white rounded-tr-sm"
                }`}
              >
                {/* Message Text */}
                <div className="whitespace-pre-line leading-relaxed">{m.message}</div>

                {/* Tool Executions Cards */}
                {m.tool_calls && m.tool_calls.length > 0 && (
                  <div className="mt-2.5 space-y-2 border-t border-gray-700/60 pt-2">
                    {m.tool_calls.map((tool, tIdx) => (
                      <div
                        key={tIdx}
                        className="rounded-xl border border-blue-500/30 bg-blue-950/40 p-2.5 text-[11px] shadow-sm"
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-blue-400 mb-1">
                          <Zap className="h-3.5 w-3.5 fill-blue-400" />
                          <span>Tool Executed: {tool.tool}()</span>
                        </div>

                        {/* Payment Link Card */}
                        {tool.payment_url && (
                          <div className="mt-2 rounded-lg bg-gray-900/80 p-2 border border-gray-800">
                            <div className="flex items-center justify-between text-gray-300">
                              <span className="font-semibold text-white">Razorpay 1-Click Settlement</span>
                              <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">UPI, GPay, Cards, Netbanking</div>
                            <a
                              href={tool.payment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 flex items-center justify-center space-x-1.5 w-full rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
                            >
                              <span>Open Payment Link</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}

                        {/* Pause Subscription Badge */}
                        {tool.days_paused && (
                          <div className="mt-1 flex items-center space-x-1.5 text-purple-300">
                            <PauseCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Subscription safely paused for {tool.days_paused} days</span>
                          </div>
                        )}

                        {/* Schedule Retry Badge */}
                        {tool.scheduled_for && (
                          <div className="mt-1 flex items-center space-x-1.5 text-cyan-300">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>Auto-retry scheduled: {tool.scheduled_for}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Timestamp & Checkmarks */}
                <div className="mt-1 flex items-center justify-end space-x-1 text-[10px] text-gray-400">
                  <span>{m.timestamp}</span>
                  {!isAgent && <CheckCheck className="h-3.5 w-3.5 text-cyan-400" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center space-x-1.5 rounded-2xl bg-[#202c33] px-4 py-2.5 text-xs text-gray-300 w-24">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Objection Quick Reply Chips */}
      {sessionId && !isRecovered && (
        <div className="bg-[#111b21] px-3 py-2 border-t border-gray-800/60 overflow-x-auto flex space-x-2 scrollbar-none">
          {QUICK_OBJECTIONS.map((obj, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(obj)}
              disabled={isTyping}
              className="whitespace-nowrap rounded-full border border-gray-700 bg-gray-800/80 px-2.5 py-1 text-[11px] font-medium text-gray-300 hover:border-emerald-500/50 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors disabled:opacity-50 shrink-0"
            >
              💬 {obj}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="flex items-center space-x-2 bg-[#202c33] p-3 border-t border-gray-800">
        <input
          type="text"
          placeholder={sessionId ? "Type customer response or objection..." : "Dispatch webhook on left to start chat..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={!sessionId || isTyping}
          className="flex-1 rounded-xl bg-[#2a3942] px-4 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!sessionId || !inputText.trim() || isTyping}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md hover:bg-emerald-500 transition-colors disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "RecoverFlow AI | Intelligent Automated Revenue Recovery",
  description: "AI-powered revenue recovery platform handling failed subscription payments using intelligent retries and interactive AI dunning agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-gray-100 antialiased selection:bg-blue-600 selection:text-white">
        <Navbar />
        <main className="min-h-[calc(100vh-65px)]">{children}</main>
        <footer className="border-t border-gray-800/80 bg-gray-950/60 py-6 text-center text-xs text-gray-500">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <p>© {new Date().getFullYear()} RecoverFlow AI. Production-grade automated revenue recovery platform.</p>
            <div className="flex space-x-4 text-gray-400">
              <span>PCI-DSS Level 1 Compliant</span>
              <span>•</span>
              <span>HMAC SHA-256 Verified</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

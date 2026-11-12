import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AutoScribeProvider } from "@/context/AutoScribeStore";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoScribe — Autonomous AI Escrow & PayPal Settlement",
  description:
    "Abyssal agentic commerce protocol combining multi-modal GitHub diff verification, prompt-injection security guardrails, and autonomous PayPal Payouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Load Satoshi (Auros geometric grotesk) + Plus Jakarta Sans + JetBrains Mono */}
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#012624] text-[#bbc7c6] antialiased selection:bg-[#00827c] selection:text-[#ffffff]">
        <AutoScribeProvider>{children}</AutoScribeProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#003734",
              color: "#edfffe",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "16px 20px",
              fontFamily: "var(--font-matter)",
            },
          }}
        />
      </body>
    </html>
  );
}

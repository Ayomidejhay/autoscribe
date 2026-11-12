"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Lock, Cpu, DollarSign } from "lucide-react";
import { useAutoScribe } from "@/context/AutoScribeStore";
import { BioluminescentOrb } from "@/components/BioluminescentOrb";

export default function LandingGatewayPage() {
  const { currentUser, isSupabaseReady } = useAutoScribe();

  return (
    <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex flex-col justify-between">
      {/* Header */}
      <header className="h-24 border-b border-white/[0.07]">
        <div className="max-w-[1440px] mx-auto px-8 lg:px-16 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-[6px] bg-[#003734] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#cbfffc]" />
            </div>
            <span className="text-[21px] font-medium tracking-[-0.025em] text-white">
              AutoScribe
            </span>
          </div>

          <nav className="flex items-center gap-8">
            {currentUser ? (
              <Link
                href={currentUser.role === "client" ? "/client" : "/freelancer"}
                className="auros-btn-aurora px-6 py-3 flex items-center gap-2"
              >
                <span>Open {currentUser.role} Dashboard</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[12px] uppercase tracking-[0.12em] text-[#edfffe] hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="auros-btn-aurora px-6 py-3 flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Spacious Hero Band */}
      <main className="max-w-[1440px] mx-auto w-full px-8 lg:px-16 py-20 lg:py-28 space-y-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7 space-y-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-[6px] bg-[#003734]">
              <span className="w-2 h-2 rounded-full bg-[#cbfffc]" />
              <span className="auros-kicker">
                {isSupabaseReady
                  ? "Live Supabase Auth & Realtime Active"
                  : "Agentic Commerce Escrow Protocol"}
              </span>
            </div>

            <h1 className="auros-display text-[52px] sm:text-[72px] lg:text-[86px]">
              Autonomous escrow &amp; code verification.
            </h1>

            <p className="text-[19px] text-[#bbc7c6] max-w-2xl leading-[1.65]">
              AutoScribe bridges the trust gap between clients and freelance
              engineers. Fund milestones via{" "}
              <span className="text-[#edfffe]">PayPal Orders</span>, verify
              GitHub commit diffs with multi-modal AI guardrails, and trigger
              instant <span className="text-[#edfffe]">PayPal Payouts</span> the
              moment acceptance criteria pass.
            </p>

            <div className="flex flex-wrap items-center gap-5 pt-2">
              <Link
                href="/signup"
                className="auros-btn-aurora px-8 py-4 flex items-center gap-3"
              >
                <span>Create Client or Freelancer Account</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-[12px] uppercase tracking-[0.12em] text-white font-medium transition-colors"
              >
                Sign In to Existing Workspace
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex items-center justify-center">
            <BioluminescentOrb isActive={false} size={400} />
          </div>
        </div>

        {/* 3 Feature Surface Cards (#003734 with 36px-44px padding) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-[16px] bg-[#003734] p-10 space-y-5">
            <Lock className="w-6 h-6 text-[#cbfffc]" />
            <h3 className="auros-heading text-[26px]">
              Row-Level Security Isolation
            </h3>
            <p className="text-[15px] text-[#bbc7c6] leading-[1.65]">
              Clients manage contracts across multiple freelancers from one
              dashboard, while each freelancer only sees projects bound or
              invited to their email address.
            </p>
          </div>

          <div className="rounded-[16px] bg-[#003734] p-10 space-y-5">
            <Cpu className="w-6 h-6 text-[#cbfffc]" />
            <h3 className="auros-heading text-[26px]">
              AST Diff &amp; Injection Shield
            </h3>
            <p className="text-[15px] text-[#bbc7c6] leading-[1.65]">
              The AI Verification Agent inspects real GitHub commit diffs
              against acceptance criteria while scanning for adversarial prompt
              injection in code comments.
            </p>
          </div>

          <div className="rounded-[16px] bg-[#003734] p-10 space-y-5">
            <DollarSign className="w-6 h-6 text-[#fde9ff]" />
            <h3 className="auros-heading text-[26px]">
              Autonomous PayPal Settlement
            </h3>
            <p className="text-[15px] text-[#bbc7c6] leading-[1.65]">
              Choose Autonomous release (instant PayPal Payouts API execution at
              ≥90% confidence) or Co-Pilot mode with Plain-English summaries for
              non-technical clients.
            </p>
          </div>
        </div>
      </main>

      {/* Recessed Footer */}
      <footer className="bg-[#011d1c] py-16">
        <div className="max-w-[1440px] mx-auto px-8 lg:px-16 flex flex-wrap items-center justify-between gap-6">
          <span className="text-sm text-white font-medium">
            AutoScribe — Autonomous Freelance Escrow
          </span>
          <span className="auros-caption">
            PayPal Orders v2 • PayPal Payouts v1 • Supabase Auth &amp; RLS
          </span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import React from "react";
import { MilestoneStatus } from "@/types/autoscribe";

interface MolecularDiagramProps {
  status: MilestoneStatus;
  confidenceScore?: number;
}

export function MolecularDiagram({
  status,
  confidenceScore,
}: MolecularDiagramProps) {
  const isFunded =
    status === "funded" ||
    status === "verifying" ||
    status === "verified" ||
    status === "paid" ||
    status === "revision_requested" ||
    status === "disputed";
  const isVerified = status === "verified" || status === "paid";
  const isPaid = status === "paid";

  return (
    <div className="rounded-[16px] bg-[#011d1c] p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="auros-caption">
          Escrow State Topology
        </span>
        <span className="font-mono text-xs text-[#edfffe]">
          {typeof confidenceScore === "number"
            ? `${confidenceScore}% Confidence`
            : "Standby"}
        </span>
      </div>

      <svg
        viewBox="0 0 420 112"
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Autonomous escrow verification molecular state diagram"
      >
        <line
          x1="54"
          y1="48"
          x2="156"
          y2="48"
          stroke={isFunded ? "#ffffff" : "#707777"}
          strokeWidth="1"
          strokeDasharray={isFunded ? "none" : "3 3"}
        />
        <line
          x1="156"
          y1="48"
          x2="264"
          y2="48"
          stroke={isVerified ? "#ffffff" : "#707777"}
          strokeWidth="1"
        />
        <line
          x1="264"
          y1="48"
          x2="366"
          y2="48"
          stroke={isPaid ? "#fde9ff" : "#707777"}
          strokeWidth="1"
        />

        {/* Node 1: Orders Vault */}
        <circle
          cx="54"
          cy="48"
          r="18"
          fill={isFunded ? "#003734" : "#011d1c"}
          stroke={isFunded ? "#ffffff" : "#707777"}
          strokeWidth="1.2"
        />
        <circle
          cx="54"
          cy="48"
          r="4.5"
          fill={isFunded ? "#edfffe" : "#707777"}
        />
        <text
          x="54"
          y="88"
          textAnchor="middle"
          fill="#bbc7c6"
          fontSize="9"
          letterSpacing="1.4"
        >
          01 VAULT
        </text>

        {/* Node 2: GitHub Diff AST */}
        <circle
          cx="156"
          cy="48"
          r="18"
          fill={status !== "pending" ? "#003734" : "#011d1c"}
          stroke={status !== "pending" ? "#ffffff" : "#707777"}
          strokeWidth="1.2"
        />
        <circle
          cx="156"
          cy="48"
          r="4.5"
          fill={status !== "pending" ? "#cbfffc" : "#707777"}
        />
        <text
          x="156"
          y="88"
          textAnchor="middle"
          fill="#bbc7c6"
          fontSize="9"
          letterSpacing="1.4"
        >
          02 DIFF AST
        </text>

        {/* Node 3: AI Security & Rubric */}
        <circle
          cx="264"
          cy="48"
          r="18"
          fill={isVerified ? "#003734" : "#011d1c"}
          stroke={isVerified ? "#ffffff" : "#707777"}
          strokeWidth="1.2"
        />
        <circle
          cx="264"
          cy="48"
          r="4.5"
          fill={isVerified ? "#edfffe" : "#707777"}
        />
        <text
          x="264"
          y="88"
          textAnchor="middle"
          fill="#bbc7c6"
          fontSize="9"
          letterSpacing="1.4"
        >
          03 AI RUBRIC
        </text>

        {/* Node 4: PayPal Payouts Rail */}
        <circle
          cx="366"
          cy="48"
          r="20"
          fill={isPaid ? "#fde9ff" : "#011d1c"}
          stroke={isPaid ? "#fde9ff" : "#707777"}
          strokeWidth="1.2"
        />
        <circle
          cx="366"
          cy="48"
          r="5"
          fill={isPaid ? "#012624" : "#707777"}
        />
        <text
          x="366"
          y="88"
          textAnchor="middle"
          fill={isPaid ? "#fde9ff" : "#bbc7c6"}
          fontSize="9"
          letterSpacing="1.4"
        >
          04 PAYOUT
        </text>
      </svg>
    </div>
  );
}

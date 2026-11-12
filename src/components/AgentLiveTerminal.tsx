"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  FileCode2,
  Send,
  Loader2,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  AgentLogEntry,
  DemoPresetSubmission,
  Milestone,
} from "@/types/autoscribe";
import {
  DEFAULT_SANDBOX_PRESETS,
  buildMilestonePresetSubmissions,
} from "@/lib/sandbox-presets";

interface AgentLiveTerminalProps {
  milestone: Milestone;
  logs: AgentLogEntry[];
  isRunning: boolean;
  activeStepIndex: number;
  selectedPreset?: DemoPresetSubmission;
}

export function AgentLiveTerminal({
  milestone,
  logs,
  isRunning,
  activeStepIndex,
  selectedPreset,
}: AgentLiveTerminalProps) {
  const [activeTab, setActiveTab] = useState<"stream" | "diff">("stream");

  const visibleLogs = logs.slice(0, activeStepIndex);

  // Check if any log contains dynamically fetched or scanned diff files in its metadata
  const toolCallLog = logs.find(
    (l) => l.step_type === "TOOL_CALL" && l.metadata?.filesChanged
  );
  const metadataDiff = toolCallLog?.metadata?.filesChanged as
    | { filename: string; additions: number; deletions: number; patch: string }[]
    | undefined;

  const milestonePresets = buildMilestonePresetSubmissions(milestone);
  const fallbackPreset = selectedPreset || milestonePresets[0] || DEFAULT_SANDBOX_PRESETS[0];
  const matchedPreset =
    milestonePresets.find(
      (p) =>
        p.commitUrl.toLowerCase() ===
        (milestone.github_commit_url || fallbackPreset.commitUrl).toLowerCase()
    ) ||
    DEFAULT_SANDBOX_PRESETS.find(
      (p) =>
        p.commitUrl.toLowerCase() ===
        (milestone.github_commit_url || fallbackPreset.commitUrl).toLowerCase()
    ) ||
    milestonePresets[0] ||
    fallbackPreset;

  const diffSource = metadataDiff && metadataDiff.length > 0
    ? {
        sha: (toolCallLog?.metadata?.sha as string) || "live-diff",
        author: (toolCallLog?.metadata?.author as string) || "git-author",
        message: (toolCallLog?.metadata?.message as string) || "Submitted commit",
        filesChanged: metadataDiff,
      }
    : matchedPreset.simulatedDiff;

  return (
    <div className="rounded-[16px] bg-[#011d1c] overflow-hidden flex flex-col">
      {/* Spacious Terminal Header */}
      <div className="px-8 py-6 bg-[#003734] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-[#cbfffc]" />
          <span className="auros-kicker">
            AI Verification Stream
          </span>
        </div>

        {/* Clean Tab Toggle */}
        <div className="flex items-center gap-2 bg-[#011d1c] p-1.5 rounded-[6px]">
          <button
            onClick={() => setActiveTab("stream")}
            className={`px-3.5 py-1.5 rounded-[6px] text-[11px] uppercase tracking-[0.12em] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "stream"
                ? "bg-[#003734] text-white"
                : "text-[#bbc7c6] hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span>Logs ({visibleLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("diff")}
            className={`px-3.5 py-1.5 rounded-[6px] text-[11px] uppercase tracking-[0.12em] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "diff"
                ? "bg-[#003734] text-white"
                : "text-[#bbc7c6] hover:text-white"
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-[#fde9ff]" />
            <span>Git Diff ({diffSource.filesChanged.length})</span>
          </button>
        </div>
      </div>

      {/* Generous Recessed Well Body */}
      <div className="p-8 font-mono text-xs space-y-4 min-h-[380px] max-h-[560px] overflow-y-auto">
        {activeTab === "stream" ? (
          <>
            {visibleLogs.length === 0 && !isRunning && (
              <div className="h-72 flex flex-col items-center justify-center text-center space-y-4 px-6">
                <div className="w-12 h-12 rounded-[6px] bg-[#003734] flex items-center justify-center text-[#cbfffc]">
                  <Terminal className="w-5 h-5" />
                </div>
                <p className="text-[18px] font-medium text-white font-matter">
                  Verification Standby
                </p>
                <p className="max-w-sm text-[14px] text-[#bbc7c6] font-matter leading-[1.6]">
                  When a GitHub commit is submitted for{" "}
                  <span className="text-[#edfffe]">{milestone.title}</span>,
                  live tool calls and PayPal Payout telemetry stream here.
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {visibleLogs.map((log) => {
                const isPayout = log.step_type === "PAYPAL_PAYOUT";
                const isSecurityFail = log.log_level === "security_alert";

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-[8px] p-5 transition-all ${
                      isPayout && log.status === "passed"
                        ? "bg-[#003734] border border-[#cbfffc]/40"
                        : isSecurityFail
                        ? "bg-[#012624] border border-[#fde9ff]/40"
                        : "bg-[#012624]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        {log.status === "passed" ? (
                          <CheckCircle2 className="w-4 h-4 text-[#cbfffc] shrink-0 mt-1" />
                        ) : log.status === "failed" ? (
                          isSecurityFail ? (
                            <ShieldAlert className="w-4 h-4 text-[#fde9ff] shrink-0 mt-1" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#fde9ff] shrink-0 mt-1" />
                          )
                        ) : (
                          <Send className="w-4 h-4 text-[#edfffe] shrink-0 mt-1" />
                        )}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded-[4px] text-[10px] uppercase tracking-[0.14em] bg-[#011d1c] text-[#edfffe]">
                              {log.step_type}
                            </span>
                            <span className="font-medium text-white text-[13px]">
                              {log.title}
                            </span>
                          </div>
                          <p className="text-[#bbc7c6] leading-[1.6] font-matter text-[14px]">
                            {log.detail}
                          </p>
                          {isPayout && Boolean(log.metadata?.payoutBatchId) && (
                            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                              <span className="text-[#fde9ff] font-mono">
                                BATCH ID: {String(log.metadata?.payoutBatchId)}
                              </span>
                              <span className="px-2.5 py-1 rounded-[4px] bg-[#011d1c] text-[#cbfffc] uppercase tracking-[0.12em] text-[10px]">
                                HTTP 201 • PAYOUT SETTLED
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-[#707777] shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isRunning && (
              <div className="flex items-center gap-3.5 p-5 rounded-[8px] bg-[#003734] text-[#edfffe]">
                <Loader2 className="w-4 h-4 animate-spin text-[#cbfffc]" />
                <span className="auros-caption text-[#edfffe]">
                  Inspecting AST Diff &amp; Evaluating Rubric...
                </span>
              </div>
            )}
          </>
        ) : (
          /* GitHub Commit Diff Inspector Tab */
          <div className="space-y-6">
            <div className="p-5 rounded-[8px] bg-[#003734] flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-white">
                  Commit{" "}
                  <span className="text-[#cbfffc]">{diffSource.sha}</span> by @
                  {diffSource.author}
                </p>
                <p className="text-sm text-[#bbc7c6] font-matter">
                  {diffSource.message}
                </p>
              </div>
              <a
                href={milestone.github_commit_url || fallbackPreset.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="auros-arrow-btn"
                title="Inspect on GitHub"
              >
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            {diffSource.filesChanged.map((file) => (
              <div
                key={file.filename}
                className="rounded-[8px] overflow-hidden bg-[#012624]"
              >
                <div className="px-5 py-3.5 bg-[#003734] flex items-center justify-between">
                  <span className="text-white font-medium text-xs">
                    {file.filename}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[#cbfffc]">+{file.additions}</span>
                    <span className="text-[#fde9ff]">-{file.deletions}</span>
                  </div>
                </div>
                <pre className="p-5 text-[12px] leading-[1.65] overflow-x-auto text-[#bbc7c6]">
                  {file.patch.split("\n").map((line, i) => {
                    const isAdd = line.startsWith("+");
                    const isDel = line.startsWith("-");
                    return (
                      <div
                        key={i}
                        className={`px-2 py-0.5 rounded-[2px] ${
                          isAdd
                            ? "bg-[#003734]/75 text-[#edfffe]"
                            : isDel
                            ? "bg-[#fde9ff]/10 text-[#fde9ff]"
                            : "text-[#bbc7c6]"
                        }`}
                      >
                        {line}
                      </div>
                    );
                  })}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

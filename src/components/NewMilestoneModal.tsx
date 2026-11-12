"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Loader2,
  Bot,
  UserCheck,
  CheckSquare,
  ArrowUpRight,
} from "lucide-react";
import {
  AcceptanceCriterion,
  Milestone,
  ReleaseMode,
} from "@/types/autoscribe";
import { generateSmartCriteriaAction } from "@/app/actions/escrow";

interface NewMilestoneModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onCreateMilestone: (milestone: Milestone) => void;
}

export function NewMilestoneModal({
  isOpen,
  projectId,
  onClose,
  onCreateMilestone,
}: NewMilestoneModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("950");
  const [releaseMode, setReleaseMode] = useState<ReleaseMode>("autonomous");
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [lastSynthSig, setLastSynthSig] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentSig = `${title.trim()}|${description.trim()}`;

  const handleGenerateCriteria = async () => {
    if (!title.trim() && !description.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateSmartCriteriaAction({
        title: title.trim() || "Milestone Deliverable",
        description: description.trim(),
      });
      setCriteria(generated);
      setLastSynthSig(currentSig);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      let finalCriteria = criteria;
      if (finalCriteria.length === 0 || lastSynthSig !== currentSig) {
        finalCriteria = await generateSmartCriteriaAction({
          title: title.trim(),
          description: description.trim(),
        });
      }

      const newMs: Milestone = {
        id: `ms_${Date.now().toString(36)}`,
        project_id: projectId,
        title: title.trim(),
        description:
          description.trim() ||
          `Deliverable for ${title.trim()} verified against acceptance criteria and GitHub diff.`,
        amount: Math.max(50, parseFloat(amount) || 500),
        status: "pending",
        release_mode: releaseMode,
        acceptance_criteria: finalCriteria,
        created_at: new Date().toISOString(),
      };

      onCreateMilestone(newMs);
      setTitle("");
      setDescription("");
      setCriteria([]);
      setLastSynthSig("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#011d1c]/90 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-lg rounded-[16px] border border-white/10 bg-[#003734] overflow-hidden shadow-[0_24px_64px_-24px_rgba(0,0,0,0.7)]"
        >
          <div className="px-7 py-5 bg-[#011d1c] border-b border-white/10 flex items-center justify-between">
            <div>
              <span className="auros-caption block text-[#cbfffc]">
                CONTRACT APPEND // TAILORED MILESTONE RUBRIC
              </span>
              <h3 className="text-[20px] font-medium text-white tracking-[-0.02em] mt-0.5">
                Append Smart Escrow Milestone
              </h3>
            </div>
            <button
              onClick={onClose}
              className="auros-arrow-btn cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-7 space-y-5">
            <div>
              <label className="auros-caption block mb-2 text-[#edfffe]">
                MILESTONE TITLE
              </label>
              <div className="auros-input-shell">
                <input
                  type="text"
                  required
                  placeholder="e.g. 04 / Stripe Subscription Billing & Webhook Handler"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-[#707777] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="auros-caption block mb-2 text-[#edfffe]">
                  ESCROW ALLOCATION (USD)
                </label>
                <div className="auros-input-shell">
                  <input
                    type="number"
                    min="10"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#fde9ff] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="auros-caption block mb-2 text-[#edfffe]">
                  SETTLEMENT RELEASE MODE
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#011d1c] p-1.5 rounded-[10px] border border-white/10">
                  <button
                    type="button"
                    onClick={() => setReleaseMode("autonomous")}
                    className={`py-2.5 px-2 rounded-[6px] text-[11px] uppercase tracking-[0.1em] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      releaseMode === "autonomous"
                        ? "bg-[#003734] text-white border border-[#cbfffc]/40"
                        : "text-[#bbc7c6] hover:text-white"
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-[#cbfffc]" />
                    <span>AUTO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReleaseMode("copilot")}
                    className={`py-2.5 px-2 rounded-[6px] text-[11px] uppercase tracking-[0.1em] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      releaseMode === "copilot"
                        ? "bg-[#003734] text-white border border-[#fde9ff]/40"
                        : "text-[#bbc7c6] hover:text-white"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#fde9ff]" />
                    <span>CO-PILOT</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="auros-caption block mb-2 text-[#edfffe]">
                DELIVERABLE SPECIFICATION
              </label>
              <div className="auros-input-shell">
                <textarea
                  rows={2}
                  required
                  placeholder="Describe the exact endpoints, UI components, or behaviors expected in this milestone..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#edfffe] placeholder-[#707777] focus:outline-none"
                />
              </div>
            </div>

            {/* AI Acceptance Criteria Generator */}
            <div className="rounded-[10px] bg-[#011d1c] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="auros-caption text-[#edfffe] flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#cbfffc]" />
                  TAILORED RUBRIC ({criteria.length} CRITERIA)
                </span>
                <button
                  type="button"
                  onClick={handleGenerateCriteria}
                  disabled={!title.trim() || isGenerating}
                  className="text-[10px] uppercase tracking-[0.12em] font-medium px-3 py-1.5 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-[#cbfffc] border border-[#cbfffc]/35 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-[#cbfffc]" />
                  )}
                  <span>SYNTHESIZE FROM SPEC</span>
                </button>
              </div>
              {criteria.length === 0 ? (
                <p className="text-xs text-[#bbc7c6]">
                  Click <strong className="text-[#cbfffc]">Synthesize from Spec</strong>{" "}
                  to preview criteria, or submit directly to auto-generate from
                  your specification.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {criteria.map((c) => (
                    <li
                      key={c.id}
                      className="text-xs text-[#edfffe] bg-[#012624] border border-white/10 rounded-[6px] px-3 py-2"
                    >
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-3 rounded-[8px] bg-[#011d1c] border border-white/10 text-[11px] uppercase tracking-[0.12em] text-[#bbc7c6] hover:text-white cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isGenerating}
                className="auros-btn-aurora px-6 py-3 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <span>APPEND MILESTONE</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

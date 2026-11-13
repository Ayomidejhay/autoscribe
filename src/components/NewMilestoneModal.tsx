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
  Plus,
  Trash2,
  FileCode,
  DollarSign,
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGenerateCriteria = async () => {
    if (!title.trim() && !description.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateSmartCriteriaAction({
        title: title.trim() || "Milestone Deliverable",
        description: description.trim(),
      });
      if (generated && generated.length > 0) {
        setCriteria(generated);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        id: `crit_${Date.now()}_${prev.length + 1}`,
        label: "",
        requiredFilePattern: "src/**/*.ts*",
        passed: null,
      },
    ]);
  };

  const handleUpdateCriterion = (
    idx: number,
    field: "label" | "requiredFilePattern",
    value: string
  ) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveCriterion = (idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      let finalCriteria = criteria.filter((c) => c.label.trim().length > 0);

      // Only auto-generate if the client hasn't added any criteria
      if (finalCriteria.length === 0) {
        if (description.trim()) {
          finalCriteria = await generateSmartCriteriaAction({
            title: title.trim(),
            description: description.trim(),
          });
        }
        if (finalCriteria.length === 0) {
          finalCriteria = [
            {
              id: `crit_${Date.now()}_default`,
              label: `Complete verification of ${title.trim()}`,
              requiredFilePattern: "src/**/*.ts*",
              passed: null,
            },
          ];
        }
      }

      const newMs: Milestone = {
        id: `ms_${Date.now().toString(36)}`,
        project_id: projectId,
        title: title.trim(),
        description:
          description.trim() ||
          `Deliverable for ${title.trim()} verified against acceptance criteria and GitHub diff.`,
        amount: Math.max(10, parseFloat(amount) || 500),
        status: "pending",
        release_mode: releaseMode,
        acceptance_criteria: finalCriteria,
        created_at: new Date().toISOString(),
      };

      onCreateMilestone(newMs);
      setTitle("");
      setDescription("");
      setCriteria([]);
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
          className="w-full max-w-xl rounded-[16px] border border-white/10 bg-[#003734] overflow-hidden shadow-[0_24px_64px_-24px_rgba(0,0,0,0.85)] max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-7 py-5 bg-[#011d1c] border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <span className="auros-caption block text-[#cbfffc]">
                CONTRACT APPEND // CUSTOM OR AI-GENERATED
              </span>
              <h3 className="text-[20px] font-medium text-white tracking-[-0.02em] mt-0.5">
                Append Escrow Milestone
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-[6px] bg-[#003734] hover:bg-[#012624] text-[#bbc7c6] hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-7 space-y-5 overflow-y-auto"
          >
            <div>
              <label className="auros-caption block mb-1.5 text-[#edfffe]">
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
                <label className="auros-caption block mb-1.5 text-[#edfffe]">
                  ESCROW ALLOCATION (USD)
                </label>
                <div className="auros-input-shell flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#cbfffc] shrink-0" />
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
                <label className="auros-caption block mb-1.5 text-[#edfffe]">
                  PAYOUT RELEASE MODE
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#011d1c] p-1.5 rounded-[10px] border border-white/10">
                  <button
                    type="button"
                    onClick={() => setReleaseMode("autonomous")}
                    className={`py-2 px-2 rounded-[6px] text-[11px] uppercase tracking-[0.1em] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
                    className={`py-2 px-2 rounded-[6px] text-[11px] uppercase tracking-[0.1em] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
              <label className="auros-caption block mb-1.5 text-[#edfffe]">
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

            {/* Acceptance Criteria */}
            <div className="rounded-[10px] bg-[#011d1c] border border-white/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="auros-caption text-[#edfffe] flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#cbfffc]" />
                  TAILORED RUBRIC ({criteria.length} CRITERIA)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateCriteria}
                    disabled={!title.trim() || isGenerating}
                    className="text-[10px] uppercase tracking-[0.12em] font-medium px-2.5 py-1 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-[#cbfffc] border border-[#cbfffc]/35 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#cbfffc]" />
                    )}
                    <span>AI SYNTHESIZE</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="text-[10px] uppercase tracking-[0.12em] font-medium px-2.5 py-1 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-white border border-white/15 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3 text-[#cbfffc]" />
                    <span>ADD CRITERION</span>
                  </button>
                </div>
              </div>

              {criteria.length === 0 ? (
                <p className="text-xs text-[#bbc7c6] py-2 text-center">
                  Click <strong className="text-[#cbfffc]">Add Criterion</strong>{" "}
                  or <strong className="text-[#cbfffc]">AI Synthesize</strong> to
                  define automated verification requirements.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {criteria.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="rounded-[6px] bg-[#012624] border border-white/10 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase text-[#cbfffc]">
                          Criterion #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="text-[#bbc7c6] hover:text-[#ff6b81] p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        required
                        placeholder="Requirement statement (e.g. Webhook signature verified via HMAC-SHA256)"
                        value={c.label}
                        onChange={(e) =>
                          handleUpdateCriterion(idx, "label", e.target.value)
                        }
                        className="w-full bg-[#011d1c] border border-white/10 focus:border-[#cbfffc] rounded-[6px] px-3 py-1.5 text-xs text-white focus:outline-none"
                      />

                      <div className="flex items-center gap-2 bg-[#011d1c] border border-white/10 rounded-[6px] px-2.5 py-1">
                        <FileCode className="w-3 h-3 text-[#bbc7c6] shrink-0" />
                        <input
                          type="text"
                          placeholder="File pattern requirement: src/**/webhooks*.ts*"
                          value={c.requiredFilePattern || ""}
                          onChange={(e) =>
                            handleUpdateCriterion(
                              idx,
                              "requiredFilePattern",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent font-mono text-[11px] text-[#edfffe] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-[8px] bg-[#011d1c] border border-white/10 text-[11px] uppercase tracking-[0.12em] text-[#bbc7c6] hover:text-white cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isGenerating}
                className="auros-btn-aurora px-6 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
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

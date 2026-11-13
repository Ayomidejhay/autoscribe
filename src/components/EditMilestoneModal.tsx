"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Bot,
  UserCheck,
  CheckSquare,
  Sparkles,
  Plus,
  Trash2,
  FileCode,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import {
  AcceptanceCriterion,
  Milestone,
  ReleaseMode,
} from "@/types/autoscribe";
import { generateSmartCriteriaAction } from "@/app/actions/escrow";

interface EditMilestoneModalProps {
  isOpen: boolean;
  milestone: Milestone | null;
  onClose: () => void;
  onSave: (
    milestoneId: string,
    updates: Partial<Omit<Milestone, "id" | "project_id" | "created_at">>
  ) => Promise<boolean>;
}

export function EditMilestoneModal({
  isOpen,
  milestone,
  onClose,
  onSave,
}: EditMilestoneModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("500");
  const [releaseMode, setReleaseMode] = useState<ReleaseMode>("autonomous");
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setDescription(milestone.description || "");
      setAmount(milestone.amount.toString());
      setReleaseMode(milestone.release_mode);
      setCriteria(
        milestone.acceptance_criteria && milestone.acceptance_criteria.length > 0
          ? milestone.acceptance_criteria.map((c) => ({ ...c }))
          : []
      );
    }
  }, [milestone]);

  if (!isOpen || !milestone) return null;

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

  const handleSynthesizeCriteria = async () => {
    if (!title.trim() && !description.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateSmartCriteriaAction({
        title: title.trim() || milestone.title,
        description: description.trim() || milestone.description,
      });
      if (generated && generated.length > 0) {
        setCriteria(generated);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await onSave(milestone.id, {
        title: title.trim(),
        description: description.trim(),
        amount: Math.max(10, parseFloat(amount) || milestone.amount),
        release_mode: releaseMode,
        acceptance_criteria: criteria.filter((c) => c.label.trim().length > 0),
      });
      if (success) {
        onClose();
      }
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
          className="w-full max-w-2xl rounded-[16px] border border-white/10 bg-[#003734] overflow-hidden shadow-[0_24px_64px_-24px_rgba(0,0,0,0.85)] max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="px-7 py-5 bg-[#011d1c] border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <span className="auros-caption block text-[#cbfffc]">
                CONTRACT MANAGEMENT // EDIT MILESTONE RUBRIC
              </span>
              <h3 className="text-[20px] font-medium text-white tracking-[-0.02em] mt-0.5">
                Edit Milestone &amp; Acceptance Criteria
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
            {/* Title */}
            <div>
              <label className="auros-caption block mb-1.5 text-[#edfffe]">
                MILESTONE TITLE
              </label>
              <div className="auros-input-shell">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-[#707777] focus:outline-none"
                />
              </div>
            </div>

            {/* Amount & Release Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="auros-caption block mb-1.5 text-[#edfffe]">
                  ESCROW AMOUNT (USD)
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
                    <span>AUTONOMOUS</span>
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

            {/* Description */}
            <div>
              <label className="auros-caption block mb-1.5 text-[#edfffe]">
                DELIVERABLE SPECIFICATION
              </label>
              <div className="auros-input-shell">
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#edfffe] placeholder-[#707777] focus:outline-none"
                />
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="rounded-[10px] bg-[#011d1c] border border-white/10 p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="auros-caption text-[#edfffe] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#cbfffc]" />
                  ACCEPTANCE CRITERIA &amp; FILE PATTERNS ({criteria.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSynthesizeCriteria}
                    disabled={isGenerating}
                    className="px-2.5 py-1 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 border border-[#cbfffc]/30 text-[10px] uppercase tracking-[0.12em] text-[#cbfffc] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#cbfffc]" />
                    )}
                    <span>AI Re-generate</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="px-2.5 py-1 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 border border-white/15 text-[10px] uppercase tracking-[0.12em] text-[#edfffe] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Criterion</span>
                  </button>
                </div>
              </div>

              {criteria.length === 0 ? (
                <p className="text-xs text-[#bbc7c6] py-3 text-center">
                  No criteria defined. Click{" "}
                  <strong className="text-[#cbfffc]">Add Criterion</strong> or{" "}
                  <strong className="text-[#cbfffc]">AI Re-generate</strong> to create automated checks.
                </p>
              ) : (
                <div className="space-y-3">
                  {criteria.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="rounded-[8px] bg-[#012624] border border-white/10 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#cbfffc]">
                          Criterion #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="text-[#bbc7c6] hover:text-[#ff6b81] transition-colors p-1"
                          title="Remove criterion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        required
                        placeholder="Requirement statement (e.g. Verified HMAC-SHA256 signature guard in route handler)"
                        value={c.label}
                        onChange={(e) =>
                          handleUpdateCriterion(idx, "label", e.target.value)
                        }
                        className="w-full bg-[#011d1c] border border-white/10 focus:border-[#cbfffc] rounded-[6px] px-3 py-1.5 text-xs text-white placeholder-[#707777] focus:outline-none"
                      />

                      <div className="flex items-center gap-2 bg-[#011d1c] border border-white/10 rounded-[6px] px-2.5 py-1">
                        <FileCode className="w-3.5 h-3.5 text-[#bbc7c6] shrink-0" />
                        <input
                          type="text"
                          placeholder="Required file pattern: src/**/webhooks*.ts*"
                          value={c.requiredFilePattern || ""}
                          onChange={(e) =>
                            handleUpdateCriterion(
                              idx,
                              "requiredFilePattern",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent font-mono text-[11px] text-[#edfffe] placeholder-[#707777] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-[8px] bg-[#011d1c] border border-white/10 text-[11px] uppercase tracking-[0.12em] text-[#bbc7c6] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isGenerating}
                className="auros-btn-aurora px-6 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save Changes</span>
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


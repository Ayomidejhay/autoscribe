"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  GitBranch,
  X,
  Sparkles,
  Lock,
  Loader2,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  ShieldCheck,
  Code2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bot,
  UserCheck,
  FileCode,
  CheckSquare,
  Wand2,
  Scale,
} from "lucide-react";
import {
  AcceptanceCriterion,
  Milestone,
  Project,
  ReleaseMode,
} from "@/types/autoscribe";
import {
  generateProjectScopeBreakdownAction,
  generateSmartCriteriaAction,
} from "@/app/actions/escrow";

export interface GeneratedMilestoneDraft {
  id?: string;
  title: string;
  description: string;
  amount: number;
  release_mode: ReleaseMode;
  acceptance_criteria: AcceptanceCriterion[];
}

interface NewProjectInviteModalProps {
  isOpen: boolean;
  clientUser: {
    id: string;
    name: string;
    email: string;
  };
  onClose: () => void;
  onCreateProject: (project: Project, initialMilestones: Milestone[]) => void;
}

export function NewProjectInviteModal({
  isOpen,
  clientUser,
  onClose,
  onCreateProject,
}: NewProjectInviteModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState(
    "https://github.com/horizon-labs/repository"
  );
  const [invitedEmail, setInvitedEmail] = useState("");
  const [totalBudget, setTotalBudget] = useState("3000");

  const [milestoneCreationMode, setMilestoneCreationMode] = useState<
    "ai" | "manual"
  >("ai");
  const [expandedMilestoneIndices, setExpandedMilestoneIndices] = useState<
    number[]
  >([0, 1, 2]);

  const [isDecomposing, setIsDecomposing] = useState(false);
  const [generatingCriteriaIdx, setGeneratingCriteriaIdx] = useState<
    number | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [generatedMilestones, setGeneratedMilestones] = useState<
    GeneratedMilestoneDraft[]
  >([]);

  if (!isOpen) return null;

  const totalAllocated = generatedMilestones.reduce(
    (sum, m) => sum + (Number(m.amount) || 0),
    0
  );
  const targetNum = Math.max(100, parseFloat(totalBudget) || 3000);
  const budgetDiff = Math.round((targetNum - totalAllocated) * 100) / 100;

  const toggleExpand = (idx: number) => {
    setExpandedMilestoneIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleDecomposeWithAI = async () => {
    if (!title.trim() && !description.trim()) {
      setErrorMsg(
        "Enter a Project Title and Architectural Brief first so the AI Agent can decompose your specific requirements."
      );
      return;
    }
    setErrorMsg(null);
    setIsDecomposing(true);
    try {
      const breakdown = await generateProjectScopeBreakdownAction({
        title: title.trim() || "Custom Software Contract",
        description: description.trim(),
        totalBudget: targetNum,
      });
      setGeneratedMilestones(
        breakdown.map((m, idx) => ({
          ...m,
          id: `draft_ms_${Date.now()}_${idx}`,
        }))
      );
      setExpandedMilestoneIndices([0, 1, 2]);
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleAddCustomMilestone = () => {
    const currentCount = generatedMilestones.length;
    const defaultAmount =
      budgetDiff > 0 ? budgetDiff : Math.round(targetNum / (currentCount + 1));

    const newMilestone: GeneratedMilestoneDraft = {
      id: `draft_ms_${Date.now()}_${currentCount + 1}`,
      title: `0${currentCount + 1} / Custom Feature Deliverable`,
      description: "Implement core business logic, automated tests, and deployment.",
      amount: defaultAmount > 0 ? defaultAmount : 500,
      release_mode: "autonomous",
      acceptance_criteria: [
        {
          id: `crit_${Date.now()}_1`,
          label: `Complete functional implementation with zero placeholder stubs`,
          requiredFilePattern: "src/**/*.ts*",
          passed: null,
        },
        {
          id: `crit_${Date.now()}_2`,
          label: `Automated test suite covering happy-path and error cases`,
          requiredFilePattern: "src/__tests__/*.test.ts",
          passed: null,
        },
      ],
    };

    setGeneratedMilestones((prev) => [...prev, newMilestone]);
    setExpandedMilestoneIndices((prev) => [...prev, currentCount]);
  };

  const handleDeleteMilestone = (idx: number) => {
    setGeneratedMilestones((prev) => prev.filter((_, i) => i !== idx));
    setExpandedMilestoneIndices((prev) =>
      prev.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i))
    );
  };

  const handleUpdateMilestone = (
    idx: number,
    updates: Partial<GeneratedMilestoneDraft>
  ) => {
    setGeneratedMilestones((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...updates } : m))
    );
  };

  const handleAddCriterion = (mIdx: number) => {
    setGeneratedMilestones((prev) =>
      prev.map((m, i) =>
        i === mIdx
          ? {
              ...m,
              acceptance_criteria: [
                ...m.acceptance_criteria,
                {
                  id: `crit_${Date.now()}_${m.acceptance_criteria.length + 1}`,
                  label: "",
                  requiredFilePattern: "src/**/*.ts*",
                  passed: null,
                },
              ],
            }
          : m
      )
    );
  };

  const handleUpdateCriterion = (
    mIdx: number,
    cIdx: number,
    field: "label" | "requiredFilePattern",
    val: string
  ) => {
    setGeneratedMilestones((prev) =>
      prev.map((m, i) =>
        i === mIdx
          ? {
              ...m,
              acceptance_criteria: m.acceptance_criteria.map((c, ci) =>
                ci === cIdx ? { ...c, [field]: val } : c
              ),
            }
          : m
      )
    );
  };

  const handleRemoveCriterion = (mIdx: number, cIdx: number) => {
    setGeneratedMilestones((prev) =>
      prev.map((m, i) =>
        i === mIdx
          ? {
              ...m,
              acceptance_criteria: m.acceptance_criteria.filter(
                (_, ci) => ci !== cIdx
              ),
            }
          : m
      )
    );
  };

  const handleGenerateCriteriaForMilestone = async (mIdx: number) => {
    const target = generatedMilestones[mIdx];
    if (!target) return;
    setGeneratingCriteriaIdx(mIdx);
    try {
      const generated = await generateSmartCriteriaAction({
        title: target.title || "Feature Milestone",
        description: target.description || description,
      });
      if (generated && generated.length > 0) {
        setGeneratedMilestones((prev) =>
          prev.map((m, i) =>
            i === mIdx ? { ...m, acceptance_criteria: generated } : m
          )
        );
      }
    } finally {
      setGeneratingCriteriaIdx(null);
    }
  };

  const handleAutoBalanceBudget = () => {
    const total = targetNum;
    const count = generatedMilestones.length;
    if (count === 0) return;

    let amounts: number[] = [];
    if (count === 3) {
      const m1 = Math.round(total * 0.3 * 100) / 100;
      const m2 = Math.round(total * 0.45 * 100) / 100;
      const m3 = Math.round((total - m1 - m2) * 100) / 100;
      amounts = [m1, m2, m3];
    } else {
      const equalShare = Math.round((total / count) * 100) / 100;
      amounts = Array(count).fill(equalShare);
      const sum = amounts.reduce((a, b) => a + b, 0);
      amounts[amounts.length - 1] += Math.round((total - sum) * 100) / 100;
    }

    setGeneratedMilestones((prev) =>
      prev.map((m, i) => ({ ...m, amount: amounts[i] }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Project title is required.");
      return;
    }
    if (!invitedEmail.trim()) {
      setErrorMsg("Invited freelancer email is required.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      let activeDrafts = generatedMilestones;

      // If the client has not decomposed or created any milestones yet, auto-decompose as fallback
      if (activeDrafts.length === 0) {
        if (!description.trim()) {
          setErrorMsg(
            "Please provide an architectural brief or add at least one custom milestone before creating the contract."
          );
          setIsSubmitting(false);
          return;
        }
        activeDrafts = await generateProjectScopeBreakdownAction({
          title: title.trim(),
          description: description.trim(),
          totalBudget: targetNum,
        });
      }

      const projectId = `proj_${Date.now().toString(36)}`;
      const inviteToken = `inv_${Math.random()
        .toString(36)
        .substring(2, 10)}-${Date.now().toString(36)}`;

      const builtMilestones: Milestone[] = activeDrafts.map((m, idx) => ({
        id: `ms_${Date.now().toString(36)}_${idx}`,
        project_id: projectId,
        title: m.title.trim() || `Milestone ${idx + 1}`,
        description:
          m.description.trim() ||
          `Deliverable for ${m.title} verified via GitHub commit diffs.`,
        amount: Math.max(10, Number(m.amount) || 100),
        status: "pending",
        release_mode: m.release_mode,
        acceptance_criteria:
          m.acceptance_criteria.length > 0
            ? m.acceptance_criteria
            : [
                {
                  id: `crit_${Date.now()}_${idx}_1`,
                  label: `Verify complete delivery of ${m.title}`,
                  requiredFilePattern: "src/**/*.ts*",
                  passed: null,
                },
              ],
        created_at: new Date().toISOString(),
      }));

      const computedTotal = builtMilestones.reduce(
        (sum, m) => sum + m.amount,
        0
      );

      const newProject: Project = {
        id: projectId,
        title: title.trim(),
        description:
          description.trim() ||
          `Escrow-protected delivery for ${title.trim()} verified via GitHub commit diffs.`,
        repo_url: repoUrl.trim(),
        client_id: clientUser.id,
        client_name: clientUser.name,
        client_email: clientUser.email,
        freelancer_id: null,
        freelancer_name: "Pending Invite Acceptance",
        invited_freelancer_email: invitedEmail.trim().toLowerCase(),
        freelancer_paypal_email: "",
        invite_token: inviteToken,
        invite_status: "pending_invite",
        total_budget: computedTotal,
        status: "pending_invite",
        created_at: new Date().toISOString(),
      };

      onCreateProject(newProject, builtMilestones);
      setTitle("");
      setDescription("");
      setGeneratedMilestones([]);
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
          className="w-full max-w-4xl rounded-[20px] border border-white/10 bg-[#003734] overflow-hidden max-h-[92vh] flex flex-col shadow-[0_24px_64px_-24px_rgba(0,0,0,0.85)]"
        >
          {/* Header */}
          <div className="px-8 py-5 bg-[#011d1c] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[10px] font-mono uppercase tracking-[0.14em] bg-[#003734] text-[#cbfffc] border border-[#cbfffc]/30">
                  <Sparkles className="w-3 h-3 text-[#cbfffc]" />
                  AI &amp; Custom Contract Architect
                </span>
                <span className="text-xs text-[#bbc7c6] font-mono">
                  PayPal Escrow Vault
                </span>
              </div>
              <h3 className="text-[22px] font-medium text-white tracking-[-0.02em]">
                Create Escrow Contract &amp; Define Milestones
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-[8px] bg-[#003734] hover:bg-[#012624] text-[#bbc7c6] hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-8 space-y-6 overflow-y-auto"
          >
            {errorMsg && (
              <div className="rounded-[12px] bg-[#260b12]/90 border border-[#ff6b81]/60 p-4 text-xs text-[#ffe4e8] flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-[#ff6b81] shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Contract Basics: Title, Budget & GitHub */}
            <div className="rounded-[14px] bg-[#011d1c] border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="auros-caption block text-[#edfffe]">
                    ESCROW CONTRACT BUDGET
                  </label>
                  <p className="text-xs text-[#bbc7c6] mt-0.5">
                    Select a budget tier or enter your target contract budget.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { label: "$1,500", value: "1500" },
                    { label: "$3,000", value: "3000" },
                    { label: "$5,000", value: "5000" },
                    { label: "$10,000", value: "10000" },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setTotalBudget(preset.value)}
                      className={`px-3 py-1.5 rounded-[6px] text-xs font-mono transition-all cursor-pointer ${
                        totalBudget === preset.value
                          ? "bg-[#cbfffc] text-[#012624] font-semibold shadow-sm"
                          : "bg-[#012624] text-[#bbc7c6] hover:text-white border border-white/10"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="sm:col-span-2">
                  <label className="auros-caption block mb-1.5 text-[#edfffe]">
                    CONTRACT TITLE
                  </label>
                  <div className="auros-input-shell">
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI Resume Parser & Career Matcher SaaS"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-transparent text-sm text-white placeholder-[#707777] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="auros-caption block mb-1.5 text-[#cbfffc]">
                    TARGET BUDGET (USD)
                  </label>
                  <div className="auros-input-shell flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#cbfffc] shrink-0" />
                    <input
                      type="number"
                      min="100"
                      step="50"
                      required
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                      className="w-full bg-transparent text-sm text-[#fde9ff] font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="auros-caption block mb-1.5 text-[#edfffe]">
                    GITHUB REPOSITORY (LOCKED)
                  </label>
                  <div className="auros-input-shell flex items-center gap-2.5">
                    <GitBranch className="w-4 h-4 text-[#cbfffc] shrink-0" />
                    <input
                      type="text"
                      required
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono text-[#edfffe] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="auros-caption block mb-1.5 text-[#cbfffc]">
                    INVITED FREELANCER EMAIL
                  </label>
                  <div className="auros-input-shell flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-[#cbfffc] shrink-0" />
                    <input
                      type="email"
                      required
                      placeholder="freelancer@studio.dev"
                      value={invitedEmail}
                      onChange={(e) => setInvitedEmail(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono text-[#cbfffc] placeholder-[#707777] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Project Architectural Brief */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="auros-caption text-[#edfffe]">
                  PROJECT ARCHITECTURAL BRIEF
                </label>
                <span className="text-[11px] text-[#bbc7c6] font-mono">
                  Used by AI to decompose scope or draft verification criteria
                </span>
              </div>
              <div className="auros-input-shell">
                <textarea
                  rows={2}
                  placeholder="Outline key deliverables (e.g. 1. Resume PDF upload API & text extractor, 2. AI semantic matcher with vector embeddings, 3. Candidate scoring UI with CSV export)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#edfffe] placeholder-[#707777] focus:outline-none leading-[1.55]"
                />
              </div>
            </div>

            {/* Milestone Management Section with Mode Switcher */}
            <div className="rounded-[14px] bg-[#011d1c] border border-white/10 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <span className="auros-caption text-[#edfffe] flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#cbfffc]" />
                    MILESTONE ARCHITECTURE &amp; VERIFICATION RUBRIC
                  </span>
                  <p className="text-xs text-[#bbc7c6] mt-0.5">
                    Decompose with Gemini AI, customize each milestone, or author your own milestones from scratch.
                  </p>
                </div>

                {/* Mode Selector Pill */}
                <div className="flex items-center bg-[#012624] p-1 rounded-[8px] border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setMilestoneCreationMode("ai");
                      if (generatedMilestones.length === 0 && (title.trim() || description.trim())) {
                        handleDecomposeWithAI();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      milestoneCreationMode === "ai"
                        ? "bg-[#003734] text-[#cbfffc] shadow-sm border border-[#cbfffc]/40"
                        : "text-[#bbc7c6] hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Decompose</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMilestoneCreationMode("manual");
                      if (generatedMilestones.length === 0) {
                        handleAddCustomMilestone();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      milestoneCreationMode === "manual"
                        ? "bg-[#003734] text-[#cbfffc] shadow-sm border border-[#cbfffc]/40"
                        : "text-[#bbc7c6] hover:text-white"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Manual Setup</span>
                  </button>
                </div>
              </div>

              {/* Action Toolbar & Budget Reconciliation */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#012624] p-3.5 rounded-[10px] border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#bbc7c6]">
                    Allocated:{" "}
                    <strong className="text-white">${totalAllocated.toFixed(2)}</strong>{" "}
                    / <span className="text-[#cbfffc]">${targetNum.toFixed(2)}</span>
                  </span>
                  {budgetDiff === 0 ? (
                    <span className="text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      ✓ Balanced
                    </span>
                  ) : budgetDiff > 0 ? (
                    <span className="text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-blue-950/80 text-[#cbfffc] border border-[#cbfffc]/30">
                      +${budgetDiff.toFixed(2)} unallocated
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">
                      -${Math.abs(budgetDiff).toFixed(2)} over target
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {generatedMilestones.length > 0 && budgetDiff !== 0 && (
                    <button
                      type="button"
                      onClick={handleAutoBalanceBudget}
                      className="px-2.5 py-1.5 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-[#cbfffc] text-[11px] font-mono flex items-center gap-1.5 border border-[#cbfffc]/30 cursor-pointer transition-colors"
                      title="Proportionally balance milestone amounts to equal target budget"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Auto-Balance</span>
                    </button>
                  )}

                  {milestoneCreationMode === "ai" ? (
                    <button
                      type="button"
                      onClick={handleDecomposeWithAI}
                      disabled={isDecomposing}
                      className="px-3 py-1.5 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-[#cbfffc] text-[11px] uppercase tracking-[0.12em] font-medium flex items-center gap-1.5 border border-[#cbfffc]/40 cursor-pointer transition-colors"
                    >
                      {isDecomposing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {generatedMilestones.length > 0
                          ? "Re-Decompose Brief"
                          : "Decompose Brief into Milestones"}
                      </span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleAddCustomMilestone}
                    className="px-3 py-1.5 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-white text-[11px] uppercase tracking-[0.12em] font-medium flex items-center gap-1.5 border border-white/20 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#cbfffc]" />
                    <span>Add Milestone</span>
                  </button>
                </div>
              </div>

              {/* Milestones List */}
              {generatedMilestones.length === 0 ? (
                <div className="rounded-[10px] bg-[#012624] border border-dashed border-white/15 p-8 text-center space-y-3">
                  <p className="text-xs text-[#edfffe]">
                    {milestoneCreationMode === "ai" ? (
                      <>
                        Click{" "}
                        <strong className="text-[#cbfffc]">
                          Decompose Brief into Milestones
                        </strong>{" "}
                        above to generate tailored milestones, or switch to{" "}
                        <strong className="text-[#cbfffc]">Manual Setup</strong> to write your own.
                      </>
                    ) : (
                      <>
                        No milestones created yet. Click{" "}
                        <strong className="text-[#cbfffc]">Add Milestone</strong>{" "}
                        to define your deliverables, budgets, and criteria.
                      </>
                    )}
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleDecomposeWithAI}
                      disabled={isDecomposing}
                      className="px-4 py-2 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-[#cbfffc] text-xs font-medium flex items-center gap-2 border border-[#cbfffc]/40 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Decompose Brief with AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomMilestone}
                      className="px-4 py-2 rounded-[6px] bg-[#011d1c] hover:bg-[#012624] text-white text-xs font-medium flex items-center gap-2 border border-white/15 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#cbfffc]" />
                      <span>Create Custom Milestone</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedMilestones.map((m, idx) => {
                    const isExpanded = expandedMilestoneIndices.includes(idx);
                    return (
                      <div
                        key={m.id || idx}
                        className="rounded-[12px] bg-[#012624] border border-white/10 overflow-hidden"
                      >
                        {/* Milestone Top Bar */}
                        <div className="p-4 bg-[#011d1c] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                            <button
                              type="button"
                              onClick={() => toggleExpand(idx)}
                              className="text-[#bbc7c6] hover:text-white p-1"
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded bg-[#003734] text-[#cbfffc] border border-[#cbfffc]/30 shrink-0">
                              MS #{idx + 1}
                            </span>
                            <input
                              type="text"
                              required
                              value={m.title}
                              onChange={(e) =>
                                handleUpdateMilestone(idx, {
                                  title: e.target.value,
                                })
                              }
                              placeholder={`Milestone ${idx + 1} title`}
                              className="flex-1 bg-transparent text-xs font-medium text-white focus:outline-none focus:border-b focus:border-[#cbfffc]"
                            />
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Release Mode Selector */}
                            <div className="flex items-center bg-[#012624] p-1 rounded-[6px] border border-white/10">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateMilestone(idx, {
                                    release_mode: "autonomous",
                                  })
                                }
                                className={`px-2 py-1 rounded-[4px] text-[10px] font-mono uppercase tracking-[0.1em] flex items-center gap-1 transition-all cursor-pointer ${
                                  m.release_mode === "autonomous"
                                    ? "bg-[#003734] text-[#cbfffc] border border-[#cbfffc]/30"
                                    : "text-[#bbc7c6] hover:text-white"
                                }`}
                                title="Autonomous settlement triggered when AI verifies diff ≥90%"
                              >
                                <Bot className="w-3 h-3" />
                                <span>Auto</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateMilestone(idx, {
                                    release_mode: "copilot",
                                  })
                                }
                                className={`px-2 py-1 rounded-[4px] text-[10px] font-mono uppercase tracking-[0.1em] flex items-center gap-1 transition-all cursor-pointer ${
                                  m.release_mode === "copilot"
                                    ? "bg-[#003734] text-[#fde9ff] border border-[#fde9ff]/30"
                                    : "text-[#bbc7c6] hover:text-white"
                                }`}
                                title="Co-Pilot requires client 1-click authorization"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Co-Pilot</span>
                              </button>
                            </div>

                            {/* Amount Input */}
                            <div className="flex items-center gap-1 bg-[#012624] px-2.5 py-1 rounded-[6px] border border-white/10">
                              <span className="text-[11px] font-mono text-[#bbc7c6]">
                                $
                              </span>
                              <input
                                type="number"
                                min="10"
                                step="0.01"
                                required
                                value={m.amount}
                                onChange={(e) =>
                                  handleUpdateMilestone(idx, {
                                    amount: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-16 bg-transparent font-mono text-xs text-[#fde9ff] font-medium focus:outline-none"
                              />
                            </div>

                            {/* Delete Milestone Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteMilestone(idx)}
                              className="text-[#bbc7c6] hover:text-[#ff6b81] transition-colors p-1"
                              title="Delete milestone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Milestone Expanded Body */}
                        {isExpanded && (
                          <div className="p-5 space-y-4">
                            <div>
                              <label className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#bbc7c6] block mb-1">
                                Deliverable Specification
                              </label>
                              <textarea
                                rows={2}
                                value={m.description}
                                onChange={(e) =>
                                  handleUpdateMilestone(idx, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Describe what must be implemented in this milestone..."
                                className="w-full bg-[#011d1c] border border-white/10 focus:border-[#cbfffc] rounded-[8px] p-2.5 text-xs text-[#edfffe] placeholder-[#707777] focus:outline-none leading-relaxed"
                              />
                            </div>

                            {/* Acceptance Criteria Section */}
                            <div className="rounded-[8px] bg-[#011d1c] p-4 border border-white/10 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#edfffe] flex items-center gap-1.5">
                                  <CheckSquare className="w-3.5 h-3.5 text-[#cbfffc]" />
                                  Verifiable Acceptance Criteria (
                                  {m.acceptance_criteria.length})
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleGenerateCriteriaForMilestone(idx)
                                    }
                                    disabled={generatingCriteriaIdx === idx}
                                    className="px-2 py-1 rounded-[4px] bg-[#003734] hover:bg-[#00827c]/40 border border-[#cbfffc]/30 text-[10px] uppercase tracking-[0.1em] text-[#cbfffc] flex items-center gap-1 cursor-pointer"
                                  >
                                    {generatingCriteriaIdx === idx ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Wand2 className="w-3 h-3 text-[#cbfffc]" />
                                    )}
                                    <span>AI Suggest Criteria</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddCriterion(idx)}
                                    className="px-2 py-1 rounded-[4px] bg-[#003734] hover:bg-[#00827c]/40 border border-white/15 text-[10px] uppercase tracking-[0.1em] text-white flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3 text-[#cbfffc]" />
                                    <span>Add Requirement</span>
                                  </button>
                                </div>
                              </div>

                              {m.acceptance_criteria.length === 0 ? (
                                <p className="text-xs text-[#bbc7c6] py-2 text-center">
                                  No criteria defined yet. Click{" "}
                                  <strong className="text-[#cbfffc]">
                                    Add Requirement
                                  </strong>{" "}
                                  or{" "}
                                  <strong className="text-[#cbfffc]">
                                    AI Suggest Criteria
                                  </strong>
                                  .
                                </p>
                              ) : (
                                <div className="space-y-2.5">
                                  {m.acceptance_criteria.map((c, cIdx) => (
                                    <div
                                      key={c.id || cIdx}
                                      className="rounded-[6px] bg-[#012624] border border-white/10 p-3 space-y-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-[#cbfffc] shrink-0" />
                                          <input
                                            type="text"
                                            required
                                            value={c.label}
                                            onChange={(e) =>
                                              handleUpdateCriterion(
                                                idx,
                                                cIdx,
                                                "label",
                                                e.target.value
                                              )
                                            }
                                            placeholder="Requirement statement (e.g. Verified HMAC-SHA256 signature verification)"
                                            className="w-full bg-transparent text-xs text-white focus:outline-none"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveCriterion(idx, cIdx)
                                          }
                                          className="text-[#bbc7c6] hover:text-[#ff6b81] p-1 transition-colors"
                                          title="Remove criterion"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      <div className="flex items-center gap-2 bg-[#011d1c] px-2.5 py-1 rounded-[4px] border border-white/10">
                                        <FileCode className="w-3 h-3 text-[#bbc7c6] shrink-0" />
                                        <input
                                          type="text"
                                          value={c.requiredFilePattern || ""}
                                          onChange={(e) =>
                                            handleUpdateCriterion(
                                              idx,
                                              cIdx,
                                              "requiredFilePattern",
                                              e.target.value
                                            )
                                          }
                                          placeholder="File pattern requirement: src/**/webhooks*.ts*"
                                          className="w-full bg-transparent font-mono text-[11px] text-[#edfffe] focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RLS Security Isolation Strip */}
            <div className="rounded-[10px] bg-[#011d1c] border border-white/10 p-4 text-xs text-[#bbc7c6] flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#cbfffc] shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-medium">
                  Supabase Row-Level Security:{" "}
                </span>
                Only <code>{clientUser.email}</code> and{" "}
                <code>{invitedEmail || "invited freelancer"}</code> have access to this escrow contract.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-[8px] bg-[#011d1c] border border-white/10 text-xs uppercase tracking-[0.12em] text-[#bbc7c6] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDecomposing}
                className="auros-btn-aurora px-7 py-3.5 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Contract &amp; Locking Escrow...</span>
                  </>
                ) : (
                  <>
                    <span>Create Contract &amp; Dispatch Invite</span>
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

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
} from "lucide-react";
import {
  AcceptanceCriterion,
  Milestone,
  Project,
} from "@/types/autoscribe";
import { generateProjectScopeBreakdownAction } from "@/app/actions/escrow";

interface GeneratedMilestoneDraft {
  title: string;
  description: string;
  amount: number;
  release_mode: "autonomous" | "copilot";
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

  const [isDecomposing, setIsDecomposing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastDecomposedSig, setLastDecomposedSig] = useState<string>("");

  const [generatedMilestones, setGeneratedMilestones] = useState<
    GeneratedMilestoneDraft[]
  >([]);

  if (!isOpen) return null;

  const currentSig = `${title.trim()}|${description.trim()}|${totalBudget}`;
  const isBreakdownOutOfSync =
    generatedMilestones.length === 0 || lastDecomposedSig !== currentSig;

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
        totalBudget: parseFloat(totalBudget) || 3000,
      });
      setGeneratedMilestones(breakdown);
      setLastDecomposedSig(
        `${title.trim()}|${description.trim()}|${totalBudget}`
      );
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleUpdateMilestoneTitle = (idx: number, nextTitle: string) => {
    setGeneratedMilestones((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, title: nextTitle } : m))
    );
  };

  const handleUpdateMilestoneAmount = (idx: number, nextAmount: string) => {
    const num = Math.max(10, parseFloat(nextAmount) || 0);
    setGeneratedMilestones((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, amount: num } : m))
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
      // Always ensure milestones are freshly decomposed from the current title & brief
      let activeDrafts = generatedMilestones;
      if (isBreakdownOutOfSync) {
        activeDrafts = await generateProjectScopeBreakdownAction({
          title: title.trim(),
          description: description.trim(),
          totalBudget: parseFloat(totalBudget) || 3000,
        });
        setGeneratedMilestones(activeDrafts);
        setLastDecomposedSig(currentSig);
      }

      const projectId = `proj_${Date.now().toString(36)}`;
      const inviteToken = `inv_${Math.random()
        .toString(36)
        .substring(2, 10)}-${Date.now().toString(36)}`;

      const builtMilestones: Milestone[] = activeDrafts.map((m, idx) => ({
        id: `ms_${Date.now().toString(36)}_${idx}`,
        project_id: projectId,
        title: m.title,
        description: m.description,
        amount: m.amount,
        status: "pending",
        release_mode: m.release_mode,
        acceptance_criteria: m.acceptance_criteria,
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
      setLastDecomposedSig("");
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
          className="w-full max-w-3xl rounded-[20px] border border-white/10 bg-[#003734] overflow-hidden max-h-[92vh] flex flex-col shadow-[0_24px_64px_-24px_rgba(0,0,0,0.85)]"
        >
          {/* Enhanced Modal Header */}
          <div className="px-8 py-6 bg-[#011d1c] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[10px] font-mono uppercase tracking-[0.14em] bg-[#003734] text-[#cbfffc] border border-[#cbfffc]/30">
                  <Sparkles className="w-3 h-3 text-[#cbfffc]" />
                  AI Contract Initiator
                </span>
                <span className="text-xs text-[#bbc7c6] font-mono">
                  PayPal Escrow Vault
                </span>
              </div>
              <h3 className="text-[24px] font-medium text-white tracking-[-0.02em]">
                Create Contract &amp; Invite Freelancer
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

            {/* Budget & Target Info */}
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
                      placeholder="e.g. AI Resume Analyzer & Job Matcher SaaS"
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
            </div>

            {/* GitHub Repo & Contractor Invite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="auros-caption block mb-2 text-[#edfffe]">
                  GITHUB REPOSITORY
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
                <label className="auros-caption block mb-2 text-[#cbfffc]">
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

            {/* Project Scope Brief */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="auros-caption text-[#edfffe]">
                  PROJECT ARCHITECTURAL BRIEF
                </label>
                <span className="text-[11px] text-[#bbc7c6] font-mono">
                  Gemini decomposes this into 3 milestones
                </span>
              </div>
              <div className="auros-input-shell">
                <textarea
                  rows={3}
                  required
                  placeholder="List the exact features you want built (e.g. 1. PDF resume upload & parser API, 2. Vector similarity job matching engine, 3. Interactive candidate score dashboard with export)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#edfffe] placeholder-[#707777] focus:outline-none leading-[1.55]"
                />
              </div>
            </div>

            {/* AI Scope Breakdown Section */}
            <div className="rounded-[14px] bg-[#011d1c] border border-white/10 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="auros-caption text-[#edfffe] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#cbfffc]" />
                    AI MILESTONE DECOMPOSITION &amp; RUBRIC (
                    {generatedMilestones.length > 0
                      ? `${generatedMilestones.length} MILESTONES READY`
                      : "GENERATED FROM BRIEF"}
                    )
                  </span>
                  <p className="text-xs text-[#bbc7c6]">
                    Each milestone is assigned a portion of your ${totalBudget} USD budget and verifiable criteria.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDecomposeWithAI}
                  disabled={isDecomposing}
                  className="px-4 py-2.5 rounded-[8px] bg-[#003734] hover:bg-[#00827c]/40 border border-[#cbfffc]/40 text-[11px] uppercase tracking-[0.12em] text-[#cbfffc] font-medium flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isDecomposing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {generatedMilestones.length > 0 && !isBreakdownOutOfSync
                      ? "REGENERATE FROM BRIEF"
                      : "DECOMPOSE BRIEF INTO 3 MILESTONES"}
                  </span>
                </button>
              </div>

              {generatedMilestones.length === 0 ? (
                <div className="rounded-[10px] bg-[#012624] border border-dashed border-white/15 p-6 text-center space-y-2">
                  <p className="text-xs text-[#edfffe]">
                    Click{" "}
                    <strong className="text-[#cbfffc]">
                      Decompose Brief into 3 Milestones
                    </strong>{" "}
                    to preview and adjust your milestone titles and allocations, or submit directly and AutoScribe will generate them on creation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {generatedMilestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="rounded-[10px] bg-[#012624] border border-white/10 p-5 space-y-3.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) =>
                            handleUpdateMilestoneTitle(idx, e.target.value)
                          }
                          className="flex-1 bg-[#011d1c] border border-white/10 focus:border-[#cbfffc] rounded-[8px] px-3.5 py-2 text-xs font-medium text-white focus:outline-none"
                        />
                        <div className="flex items-center gap-2 shrink-0 bg-[#011d1c] border border-white/10 px-3 py-1.5 rounded-[8px]">
                          <span className="text-[11px] font-mono uppercase text-[#bbc7c6]">
                            USD $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={m.amount}
                            onChange={(e) =>
                              handleUpdateMilestoneAmount(idx, e.target.value)
                            }
                            className="w-20 bg-transparent font-mono text-xs text-[#fde9ff] font-medium focus:outline-none"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-[#bbc7c6] leading-[1.55]">
                        {m.description}
                      </p>

                      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        {m.acceptance_criteria.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-start gap-2.5 text-xs text-[#edfffe]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#cbfffc] shrink-0 mt-0.5" />
                            <span>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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

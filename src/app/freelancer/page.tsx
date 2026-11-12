"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  GitCommit,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Bot,
  ArrowUpRight,
  Play,
  Globe,
  MailCheck,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAutoScribe } from "@/context/AutoScribeStore";
import {
  DEFAULT_SANDBOX_PRESETS,
  buildMilestonePresetSubmissions,
} from "@/lib/sandbox-presets";
import {
  AgentLogEntry,
  DemoPresetSubmission,
  Milestone,
  MilestoneStatus,
} from "@/types/autoscribe";
import {
  DashboardSidebar,
  FreelancerDashboardSection,
} from "@/components/DashboardSidebar";
import { AgentLiveTerminal } from "@/components/AgentLiveTerminal";
import { MolecularDiagram } from "@/components/MolecularDiagram";

export default function FreelancerDashboardPage() {
  const {
    isLoadingAuth,
    currentUser,
    visibleProjects,
    milestones,
    transactions,
    logsByMilestone,
    updateUserProfile,
    acceptProjectInvite,
    runAgentVerification,
  } = useAutoScribe();

  const [activeSection, setActiveSection] =
    useState<FreelancerDashboardSection>("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("");
  const [rightPanelTab, setRightPanelTab] = useState<"telemetry" | "ledger">(
    "telemetry"
  );

  const [claimPayPalEmail, setClaimPayPalEmail] = useState<string>("");
  const [profileNameInput, setProfileNameInput] = useState<string>("");

  useEffect(() => {
    if (currentUser?.paypal_email) {
      setClaimPayPalEmail(currentUser.paypal_email);
    } else if (currentUser?.email) {
      setClaimPayPalEmail(currentUser.email);
    }
    if (currentUser?.name) {
      setProfileNameInput(currentUser.name);
    }
  }, [currentUser]);

  const [selectedPreset, setSelectedPreset] = useState<DemoPresetSubmission>(
    DEFAULT_SANDBOX_PRESETS[0]
  );
  const [commitUrlInput, setCommitUrlInput] = useState<string>(
    DEFAULT_SANDBOX_PRESETS[0].commitUrl
  );
  const [previewUrlInput, setPreviewUrlInput] = useState<string>(
    DEFAULT_SANDBOX_PRESETS[0].previewUrl
  );

  const [streamingLogs, setStreamingLogs] = useState<AgentLogEntry[]>([]);
  const [activeLogIndex, setActiveLogIndex] = useState<number>(0);
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-5 h-5 animate-spin text-[#cbfffc]" />
          <span className="auros-caption text-[#edfffe]">
            Authenticating Supabase Session...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex flex-col justify-center items-center px-8">
        <div className="max-w-lg w-full rounded-[16px] bg-[#003734] p-10 sm:p-12 text-center space-y-6">
          <span className="auros-kicker block">Supabase Auth Required</span>
          <h1 className="auros-heading text-[32px]">
            Sign in to access your Freelancer Dashboard
          </h1>
          <p className="text-[16px] text-[#bbc7c6] leading-[1.65]">
            Your assigned escrow contracts, GitHub verification pipeline, and
            PayPal Payout ledger are scoped by Supabase Row-Level Security to
            your authenticated email.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="auros-btn-aurora px-7 py-4 flex items-center gap-2"
            >
              <span>Sign In</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup"
              className="px-6 py-4 rounded-[6px] bg-[#011d1c] text-[12px] uppercase tracking-[0.12em] text-[#edfffe] hover:bg-[#012624]"
            >
              Create Freelancer Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeProject =
    visibleProjects.find((p) => p.id === selectedProjectId) ||
    visibleProjects[0];

  const projectMilestones = activeProject
    ? milestones.filter((m) => m.project_id === activeProject.id)
    : [];

  const selectedMilestone =
    projectMilestones.find((m) => m.id === selectedMilestoneId) ||
    projectMilestones[0];

  const milestonePresets = React.useMemo(() => {
    return buildMilestonePresetSubmissions(
      selectedMilestone,
      activeProject?.repo_url,
      currentUser?.name || "freelancer"
    );
  }, [selectedMilestone, activeProject?.repo_url, currentUser?.name]);

  // When selected milestone changes, sync default preset if not yet submitted
  useEffect(() => {
    if (selectedMilestone) {
      const presets = buildMilestonePresetSubmissions(
        selectedMilestone,
        activeProject?.repo_url,
        currentUser?.name || "freelancer"
      );
      if (selectedMilestone.github_commit_url) {
        setCommitUrlInput(selectedMilestone.github_commit_url);
        setPreviewUrlInput(selectedMilestone.preview_url || "");
      } else if (presets.length > 0) {
        setSelectedPreset(presets[0]);
        setCommitUrlInput(presets[0].commitUrl);
        setPreviewUrlInput(presets[0].previewUrl);
      }
    }
  }, [selectedMilestoneId, activeProject?.id]);

  const projectTransactions = activeProject
    ? transactions.filter(
        (t) =>
          t.project_id === activeProject.id ||
          projectMilestones.some((m) => m.id === t.milestone_id)
      )
    : [];

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    const firstMs = milestones.find((m) => m.project_id === projectId);
    if (firstMs) {
      setSelectedMilestoneId(firstMs.id);
    }
    setStreamingLogs([]);
    setActiveLogIndex(0);
  };

  const handleSelectPreset = (preset: DemoPresetSubmission) => {
    setSelectedPreset(preset);
    setCommitUrlInput(preset.commitUrl);
    setPreviewUrlInput(preset.previewUrl);
  };

  const handleVerifyAndPayout = async (ms: Milestone) => {
    if (!activeProject || isAgentRunning) return;
    setSelectedMilestoneId(ms.id);
    setRightPanelTab("telemetry");
    setIsAgentRunning(true);
    setStreamingLogs([]);
    setActiveLogIndex(0);

    try {
      await runAgentVerification({
        milestone: ms,
        project: activeProject,
        commitUrl: commitUrlInput,
        previewUrl: previewUrlInput,
        onStepProgress: (stepIdx, allLogs) => {
          setStreamingLogs(allLogs);
          setActiveLogIndex(stepIdx);
        },
      });
    } finally {
      setIsAgentRunning(false);
    }
  };

  const displayedLogs =
    streamingLogs.length > 0
      ? streamingLogs
      : selectedMilestone
      ? logsByMilestone[selectedMilestone.id] || []
      : [];

  const displayedStepIndex =
    streamingLogs.length > 0 ? activeLogIndex : displayedLogs.length;

  // Portfolio-wide Freelancer totals
  const portfolioEarned = milestones
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + m.amount, 0);
  const portfolioAvailableEscrow = milestones
    .filter((m) =>
      ["funded", "verifying", "verified", "revision_requested"].includes(
        m.status
      )
    )
    .reduce((sum, m) => sum + m.amount, 0);

  // Active contract totals
  const totalEarnedOnContract = projectMilestones
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + m.amount, 0);
  const availableToClaimInEscrow = projectMilestones
    .filter((m) =>
      ["funded", "verifying", "verified", "revision_requested"].includes(
        m.status
      )
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const getStatusBadge = (status: MilestoneStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#cbfffc]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid to Your PayPal
          </span>
        );
      case "verified":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#edfffe]">
            <Sparkles className="w-3.5 h-3.5 text-[#cbfffc]" />
            Verified • Awaiting Client
          </span>
        );
      case "verifying":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#fde9ff] animate-pulse">
            <Bot className="w-3.5 h-3.5" />
            AI Verifying Commit...
          </span>
        );
      case "revision_requested":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#fde9ff]">
            <XCircle className="w-3.5 h-3.5" />
            Revision Requested
          </span>
        );
      case "funded":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-white">
            <Lock className="w-3.5 h-3.5 text-[#cbfffc]" />
            Funded • Ready for PR
          </span>
        );
      case "disputed":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#fde9ff]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Security Lock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#bbc7c6]">
            <Clock className="w-3.5 h-3.5" />
            Awaiting Client Deposit
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex flex-col lg:flex-row">
      {/* Left Sidebar Navigation */}
      <DashboardSidebar
        portalType="freelancer"
        activeSection={activeSection}
        onSelectSection={(s) =>
          setActiveSection(s as FreelancerDashboardSection)
        }
        projects={visibleProjects}
        activeProjectId={activeProject?.id}
        onSelectProject={(projectId) => handleSelectProject(projectId)}
      />

      {/* Right Main Dashboard Content Area */}
      <div className="flex-1 min-w-0">
        {/* SECTION 1: OVERVIEW & EARNINGS */}
        {activeSection === "overview" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-14">
            <div className="pb-10 border-b border-white/[0.07] space-y-3">
              <span className="auros-kicker block">
                Freelancer Workspace // {currentUser.name} ({currentUser.email})
              </span>
              <h1 className="auros-display text-[40px] sm:text-[52px]">
                Earnings &amp; Assigned Escrow
              </h1>
            </div>

            {/* 3-Column Freelancer KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              <div className="rounded-[16px] bg-[#003734] p-8 space-y-3">
                <span className="auros-caption text-[#edfffe] block">
                  FUNDED IN ESCROW (READY TO CLAIM)
                </span>
                <div className="auros-stat text-[44px] sm:text-[52px]">
                  $
                  {portfolioAvailableEscrow.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-[#bbc7c6]">
                  Locked in PayPal Vault across {visibleProjects.length}{" "}
                  assigned contract{visibleProjects.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-[16px] bg-[#003734] p-8 space-y-3">
                <span className="auros-caption text-[#edfffe] block">
                  SETTLED TO YOUR PAYPAL
                </span>
                <div className="auros-stat text-[44px] sm:text-[52px]">
                  $
                  {portfolioEarned.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-[#bbc7c6]">
                  Disbursed via PayPal Payouts v1 after AI diff verification
                </p>
              </div>

              <div className="rounded-[16px] bg-[#003734] p-8 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="auros-caption text-[#edfffe] block">
                    PAYPAL PAYOUT DESTINATION
                  </span>
                  <div className="text-lg font-mono text-[#cbfffc] break-all">
                    {currentUser.paypal_email || "Not configured yet"}
                  </div>
                </div>
                <button
                  onClick={() => setActiveSection("settings")}
                  className="text-left text-xs font-mono uppercase tracking-[0.12em] text-[#edfffe] hover:text-[#cbfffc] cursor-pointer"
                >
                  Update Payout Email →
                </button>
              </div>
            </div>

            {/* Assigned Contracts List or Empty State */}
            {visibleProjects.length === 0 ? (
              <div className="rounded-[16px] bg-[#003734] p-12 space-y-6">
                <span className="auros-kicker block">
                  Supabase RLS Isolation Active
                </span>
                <h2 className="auros-heading text-[32px]">
                  No contracts invited to{" "}
                  <span className="text-[#cbfffc]">{currentUser.email}</span>{" "}
                  yet
                </h2>
                <p className="text-[16px] text-[#bbc7c6] max-w-2xl leading-[1.65]">
                  When a Client initiates a contract and invites{" "}
                  <code className="text-white">{currentUser.email}</code>,
                  Supabase automatically links the contract to your account and
                  streams it here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="auros-heading text-[26px]">
                    Assigned Contracts ({visibleProjects.length})
                  </h2>
                  <button
                    onClick={() => setActiveSection("contracts")}
                    className="text-xs font-mono uppercase tracking-[0.12em] text-[#cbfffc] hover:underline cursor-pointer"
                  >
                    Open Delivery Workspace →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {visibleProjects.map((proj) => {
                    const projMs = milestones.filter(
                      (m) => m.project_id === proj.id
                    );
                    const paidCount = projMs.filter(
                      (m) => m.status === "paid"
                    ).length;

                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          handleSelectProject(proj.id);
                          setActiveSection("contracts");
                        }}
                        className="rounded-[16px] bg-[#003734] p-8 hover:ring-1 hover:ring-[#cbfffc]/50 transition-all cursor-pointer flex flex-col justify-between gap-6"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <span
                              className={`px-2.5 py-1 rounded-[6px] text-[10px] uppercase tracking-[0.13em] ${
                                proj.invite_status === "pending_invite"
                                  ? "bg-[#012624] text-[#fde9ff]"
                                  : "bg-[#012624] text-[#cbfffc]"
                              }`}
                            >
                              {proj.invite_status === "pending_invite"
                                ? "Action: Claim Invite"
                                : "Bound Contract"}
                            </span>
                            <span className="font-mono text-sm text-[#fde9ff]">
                              $
                              {proj.total_budget.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>

                          <h3 className="text-[22px] font-medium text-white leading-[1.25]">
                            {proj.title}
                          </h3>
                          <p className="text-sm text-[#bbc7c6] line-clamp-2">
                            {proj.description}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-white/[0.08] space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#bbc7c6]">Client</span>
                            <span className="font-mono text-[#edfffe] truncate max-w-[180px]">
                              {proj.client_email}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#bbc7c6]">Milestones</span>
                            <span className="font-mono text-[#cbfffc]">
                              {paidCount}/{projMs.length} Paid
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        )}

        {/* SECTION 2: ASSIGNED CONTRACTS & DELIVERY WORKSPACE */}
        {activeSection === "contracts" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-14">
            {!activeProject ? (
              <div className="rounded-[16px] bg-[#003734] p-12 space-y-6">
                <span className="auros-kicker block">
                  No Assigned Contracts Yet
                </span>
                <h1 className="auros-heading text-[36px]">
                  Waiting for Client Invitation to {currentUser.email}
                </h1>
                <p className="text-[16px] text-[#bbc7c6] max-w-xl">
                  As soon as a Client initiates a contract and invites{" "}
                  <code>{currentUser.email}</code>, it will appear here
                  automatically.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-8 pb-10 border-b border-white/[0.07]">
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="space-y-2">
                      <span className="auros-kicker block">
                        Assigned Contract // Client: {activeProject.client_name}{" "}
                        ({activeProject.client_email})
                      </span>
                      <h1 className="auros-display text-[36px] sm:text-[46px]">
                        {activeProject.title}
                      </h1>
                    </div>

                    <a
                      href={activeProject.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-[#cbfffc] hover:underline flex items-center gap-2 bg-[#011d1c] px-4 py-2.5 rounded-[8px]"
                    >
                      <GitCommit className="w-4 h-4" />
                      {activeProject.repo_url.replace(
                        "https://github.com/",
                        ""
                      )}
                    </a>
                  </div>

                  {/* Active Contract Summary Strip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
                    <div className="rounded-[12px] bg-[#011d1c] p-6 space-y-1.5">
                      <span className="auros-caption">
                        FUNDED IN ESCROW (READY FOR PR)
                      </span>
                      <div className="auros-stat text-[36px]">
                        $
                        {availableToClaimInEscrow.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="rounded-[12px] bg-[#011d1c] p-6 space-y-1.5">
                      <span className="auros-caption">
                        SETTLED TO YOUR PAYPAL
                      </span>
                      <div className="auros-stat text-[36px]">
                        $
                        {totalEarnedOnContract.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="rounded-[12px] bg-[#011d1c] p-6 space-y-1.5">
                      <span className="auros-caption">
                        BOUND PAYPAL DESTINATION
                      </span>
                      <div className="text-base font-mono text-[#cbfffc] truncate pt-2">
                        {activeProject.freelancer_paypal_email ||
                          currentUser.paypal_email ||
                          "Unbound"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invitation Claim Banner */}
                {activeProject.invite_status === "pending_invite" && (
                  <motion.section
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[20px] bg-gradient-to-r from-[#003734] via-[#012d2b] to-[#011d1c] p-8 sm:p-10 border border-[#cbfffc]/30 space-y-7 shadow-2xl relative overflow-hidden"
                  >
                    <div className="space-y-3 max-w-3xl">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-[10px] font-mono uppercase tracking-[0.14em] bg-[#011d1c] text-[#cbfffc] border border-[#cbfffc]/40">
                          <Sparkles className="w-3.5 h-3.5 text-[#cbfffc]" />
                          Contract Invitation Ready
                        </span>
                        <span className="text-xs font-mono text-[#fde9ff]">
                          Client: {activeProject.client_name} ({activeProject.client_email})
                        </span>
                      </div>
                      <h2 className="text-[28px] sm:text-[34px] font-medium text-white tracking-[-0.02em] leading-[1.2]">
                        Claim &ldquo;{activeProject.title}&rdquo;
                      </h2>
                      <p className="text-[15px] text-[#bbc7c6] leading-[1.6]">
                        Verify or enter your PayPal Sandbox recipient email below to link this contract to your account. Once bound, you can immediately begin submitting GitHub commit diffs for autonomous escrow payouts.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                      <div className="flex-1 flex items-center gap-4 rounded-[10px] bg-[#011d1c] px-5 py-4 border border-white/10 focus-within:border-[#cbfffc]">
                        <span className="auros-caption text-[#edfffe] shrink-0">
                          PayPal Sandbox Payout Email:
                        </span>
                        <input
                          type="email"
                          value={claimPayPalEmail}
                          onChange={(e) => setClaimPayPalEmail(e.target.value)}
                          placeholder="freelancer-sb@personal.example.com"
                          className="w-full bg-transparent text-sm font-mono text-[#cbfffc] focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() =>
                          acceptProjectInvite(
                            activeProject.id,
                            claimPayPalEmail
                          )
                        }
                        className="auros-btn-aurora px-8 py-4 flex items-center justify-center gap-2.5 cursor-pointer shrink-0 shadow-lg"
                      >
                        <MailCheck className="w-4 h-4" />
                        <span>Accept Invitation &amp; Bind Escrow</span>
                      </button>
                    </div>
                  </motion.section>
                )}

                {/* 2-Column Delivery Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
                  <div className="xl:col-span-7 space-y-6">
                    {projectMilestones.map((ms) => {
                      const isSelected =
                        selectedMilestone && ms.id === selectedMilestone.id;

                      return (
                        <motion.div
                          key={ms.id}
                          layout
                          onClick={() => setSelectedMilestoneId(ms.id)}
                          className={`rounded-[16px] bg-[#003734] p-8 sm:p-10 transition-all cursor-pointer ${
                            isSelected
                              ? "ring-1 ring-[#cbfffc]/50"
                              : "opacity-85 hover:opacity-100"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-6">
                            <div className="flex flex-wrap items-center gap-3">
                              {getStatusBadge(ms.status)}
                              <span className="px-3 py-1 rounded-[6px] bg-[#012624] text-[11px] uppercase tracking-[0.12em] text-[#edfffe]">
                                {ms.release_mode === "autonomous"
                                  ? "Instant Auto Payout (≥90%)"
                                  : "Co-Pilot Release"}
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="auros-stat text-[30px] sm:text-[34px]">
                                $
                                {ms.amount.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                              <span className="auros-arrow-btn">
                                <ArrowUpRight className="w-4 h-4" />
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 space-y-2.5">
                            <h3 className="auros-heading text-[24px] sm:text-[28px]">
                              {ms.title}
                            </h3>
                            <p className="text-[15px] text-[#bbc7c6] leading-[1.65]">
                              {ms.description}
                            </p>
                          </div>

                          {isSelected && (
                            <div className="mt-7 pt-7 border-t border-white/10 space-y-7">
                              <div className="space-y-4">
                                <span className="auros-caption text-[#edfffe] block">
                                  Required Acceptance Criteria (
                                  {
                                    ms.acceptance_criteria.filter(
                                      (c) => c.passed === true
                                    ).length
                                  }
                                  /{ms.acceptance_criteria.length} Verified)
                                </span>

                                <div className="divide-y divide-white/[0.07] rounded-[12px] bg-[#012624] px-6 py-2">
                                  {ms.acceptance_criteria.map((criterion) => (
                                    <div
                                      key={criterion.id}
                                      className="py-4 flex items-start justify-between gap-4"
                                    >
                                      <div className="flex items-start gap-3.5">
                                        {criterion.passed === true ? (
                                          <CheckCircle2 className="w-4 h-4 text-[#cbfffc] shrink-0 mt-1" />
                                        ) : criterion.passed === false ? (
                                          <XCircle className="w-4 h-4 text-[#fde9ff] shrink-0 mt-1" />
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded-full border border-[#707777] shrink-0 mt-1" />
                                        )}
                                        <div className="space-y-1">
                                          <span
                                            className={`text-[15px] block ${
                                              criterion.passed === true
                                                ? "text-white font-medium"
                                                : criterion.passed === false
                                                ? "text-[#fde9ff] font-medium"
                                                : "text-[#edfffe]"
                                            }`}
                                          >
                                            {criterion.label}
                                          </span>
                                          {criterion.reasoning && (
                                            <p className="text-[13px] text-[#bbc7c6]">
                                              {criterion.reasoning}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {(ms.status === "funded" ||
                                ms.status === "revision_requested" ||
                                ms.status === "disputed" ||
                                ms.status === "verifying") && (
                                <div
                                  className="rounded-[12px] bg-[#011d1c] p-7 space-y-6"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="auros-caption text-[#edfffe] block">
                                    Submit Work for AI Verification // Choose
                                    Preset or Paste Commit URL
                                  </span>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {milestonePresets.map((preset) => {
                                      const active =
                                        selectedPreset.id === preset.id ||
                                        commitUrlInput === preset.commitUrl;
                                      return (
                                        <button
                                          key={preset.id}
                                          type="button"
                                          onClick={() =>
                                            handleSelectPreset(preset)
                                          }
                                          className={`text-left p-4 rounded-[8px] transition-all cursor-pointer ${
                                            active
                                              ? "bg-[#003734] ring-1 ring-[#cbfffc] text-white"
                                              : "bg-[#012624] text-[#bbc7c6] hover:text-white"
                                          }`}
                                        >
                                          <span className="block text-[10px] font-mono uppercase tracking-[0.12em] text-[#fde9ff] mb-1.5">
                                            {preset.badge}
                                          </span>
                                          <p className="text-xs font-medium text-white line-clamp-1">
                                            {preset.label}
                                          </p>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div className="flex items-center gap-3 rounded-[8px] bg-[#012624] px-4 py-3.5">
                                      <GitCommit className="w-4 h-4 text-[#cbfffc] shrink-0" />
                                      <input
                                        type="text"
                                        value={commitUrlInput}
                                        onChange={(e) =>
                                          setCommitUrlInput(e.target.value)
                                        }
                                        placeholder="https://github.com/owner/repo/commit/sha"
                                        className="w-full bg-transparent text-xs font-mono text-[#edfffe] focus:outline-none"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3 rounded-[8px] bg-[#012624] px-4 py-3.5">
                                      <Globe className="w-4 h-4 text-[#cbfffc] shrink-0" />
                                      <input
                                        type="text"
                                        value={previewUrlInput}
                                        onChange={(e) =>
                                          setPreviewUrlInput(e.target.value)
                                        }
                                        placeholder="https://preview-url.vercel.app"
                                        className="w-full bg-transparent text-xs font-mono text-[#edfffe] focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  <button
                                    disabled={
                                      isAgentRunning ||
                                      activeProject.invite_status !== "accepted"
                                    }
                                    onClick={() => handleVerifyAndPayout(ms)}
                                    className="auros-btn-aurora w-full py-4 px-6 flex items-center justify-center gap-2.5 disabled:opacity-40 cursor-pointer"
                                  >
                                    <Play className="w-4 h-4 fill-current" />
                                    <span>
                                      {activeProject.invite_status !==
                                      "accepted"
                                        ? "Claim Contract Invitation Above to Submit"
                                        : isAgentRunning
                                        ? "AI Verifying Diff & Dispatching PayPal Payout..."
                                        : `Verify Deliverable & Claim $${ms.amount.toFixed(
                                            2
                                          )} PayPal Payout`}
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-8">
                    {selectedMilestone && (
                      <MolecularDiagram
                        status={selectedMilestone.status}
                        confidenceScore={
                          selectedMilestone.ai_confidence_score
                        }
                      />
                    )}

                    <div className="flex items-center gap-2 bg-[#011d1c] p-2 rounded-[10px]">
                      <button
                        onClick={() => setRightPanelTab("telemetry")}
                        className={`flex-1 py-2.5 px-4 rounded-[6px] text-[11px] uppercase tracking-[0.12em] font-medium cursor-pointer transition-colors ${
                          rightPanelTab === "telemetry"
                            ? "bg-[#003734] text-white"
                            : "text-[#bbc7c6] hover:text-white"
                        }`}
                      >
                        AI Telemetry &amp; Diff
                      </button>
                      <button
                        onClick={() => setRightPanelTab("ledger")}
                        className={`flex-1 py-2.5 px-4 rounded-[6px] text-[11px] uppercase tracking-[0.12em] font-medium cursor-pointer transition-colors ${
                          rightPanelTab === "ledger"
                            ? "bg-[#003734] text-white"
                            : "text-[#bbc7c6] hover:text-white"
                        }`}
                      >
                        PayPal Ledger ({projectTransactions.length})
                      </button>
                    </div>

                    {rightPanelTab === "telemetry" && selectedMilestone ? (
                      <AgentLiveTerminal
                        milestone={selectedMilestone}
                        logs={displayedLogs}
                        isRunning={isAgentRunning}
                        activeStepIndex={displayedStepIndex}
                        selectedPreset={selectedPreset}
                      />
                    ) : (
                      <div className="rounded-[16px] bg-[#003734] p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="auros-kicker">
                            Contract Settlement Ledger
                          </span>
                          <span className="auros-caption">PayPal Sandbox</span>
                        </div>

                        {projectTransactions.length === 0 ? (
                          <p className="text-sm text-[#bbc7c6] py-8 text-center">
                            No PayPal transactions recorded on this contract
                            yet.
                          </p>
                        ) : (
                          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                            <AnimatePresence initial={false}>
                              {projectTransactions.map((tx) => (
                                <motion.div
                                  key={tx.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="rounded-[10px] bg-[#011d1c] p-5 flex items-center justify-between gap-4"
                                >
                                  <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className={`px-2 py-0.5 rounded-[4px] text-[10px] uppercase tracking-[0.13em] ${
                                          tx.type === "payout"
                                            ? "bg-[#003734] text-[#cbfffc]"
                                            : "bg-[#012624] text-[#edfffe]"
                                        }`}
                                      >
                                        {tx.type === "payout"
                                          ? "Payout"
                                          : "Deposit"}
                                      </span>
                                      <span className="font-mono text-xs text-white truncate">
                                        {tx.paypal_payout_batch_id ||
                                          tx.paypal_order_id}
                                      </span>
                                    </div>
                                    <p className="text-[#bbc7c6] truncate text-xs">
                                      {tx.milestone_title || tx.milestone_id}
                                    </p>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="auros-stat text-[24px] block">
                                      +$
                                      {tx.amount.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                      })}
                                    </span>
                                    <span className="auros-caption text-[10px]">
                                      {tx.status}
                                    </span>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        )}

        {/* SECTION 3: PAYPAL PAYOUTS LEDGER */}
        {activeSection === "ledger" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-12">
            <div className="space-y-3">
              <span className="auros-kicker block">
                Freelancer PayPal Payouts Ledger // Supabase
                `public.transactions`
              </span>
              <h1 className="auros-display text-[40px] sm:text-[52px]">
                Settled Payouts &amp; Escrow Deposits
              </h1>
              <p className="text-[18px] text-[#bbc7c6] max-w-2xl">
                Auditable PayPal Sandbox Payouts (`v1/payments/payouts`)
                released to your bound PayPal account.
              </p>
            </div>

            <div className="rounded-[16px] bg-[#003734] p-10 space-y-6">
              {transactions.length === 0 ? (
                <p className="text-base text-[#bbc7c6] py-12 text-center">
                  No payouts or deposits recorded on your assigned contracts
                  yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-[12px] bg-[#011d1c] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium ${
                              tx.type === "payout"
                                ? "bg-[#003734] text-[#cbfffc]"
                                : "bg-[#012624] text-[#edfffe]"
                            }`}
                          >
                            {tx.type === "payout"
                              ? "PayPal Payout v1"
                              : "Escrow Deposit"}
                          </span>
                          <span className="font-mono text-sm text-white">
                            {tx.paypal_payout_batch_id || tx.paypal_order_id}
                          </span>
                        </div>
                        <p className="text-base text-white font-medium">
                          {tx.milestone_title || tx.milestone_id}
                        </p>
                        {tx.recipient_paypal_email && (
                          <p className="text-xs font-mono text-[#bbc7c6]">
                            Disbursed to: {tx.recipient_paypal_email}
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="auros-stat text-[32px] block">
                          +$
                          {tx.amount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="auros-caption text-[#cbfffc]">
                          {tx.status} •{" "}
                          {new Date(tx.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        )}

        {/* SECTION 4: PAYOUT DESTINATION & SUPABASE RLS */}
        {activeSection === "settings" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-12">
            <div className="max-w-2xl space-y-10">
              <div className="space-y-3">
                <span className="auros-kicker block">
                  Freelancer Identity &amp; PayPal Payout Destination
                </span>
                <h1 className="auros-display text-[40px]">Payout Settings</h1>
              </div>

              <div className="rounded-[16px] bg-[#003734] p-10 space-y-6">
                <div>
                  <label className="auros-caption block mb-2">
                    SUPABASE AUTH UID
                  </label>
                  <div className="rounded-[8px] bg-[#011d1c] px-4 py-3 font-mono text-xs text-[#cbfffc]">
                    {currentUser.id}
                  </div>
                </div>

                <div>
                  <label className="auros-caption block mb-2">
                    AUTHENTICATED EMAIL (RLS INVITE TARGET)
                  </label>
                  <div className="rounded-[8px] bg-[#011d1c] px-4 py-3 font-mono text-sm text-white">
                    {currentUser.email}
                  </div>
                </div>

                <div>
                  <label className="auros-caption block mb-2">
                    FREELANCER DISPLAY NAME
                  </label>
                  <input
                    type="text"
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    className="w-full rounded-[8px] bg-[#011d1c] px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#cbfffc]"
                  />
                </div>

                <div>
                  <label className="auros-caption block mb-2 text-[#edfffe]">
                    PAYPAL SANDBOX PAYOUT EMAIL
                  </label>
                  <input
                    type="email"
                    value={claimPayPalEmail}
                    onChange={(e) => setClaimPayPalEmail(e.target.value)}
                    placeholder="freelancer-sb@personal.example.com"
                    className="w-full rounded-[8px] bg-[#011d1c] px-4 py-3.5 text-sm font-mono text-[#cbfffc] focus:outline-none focus:ring-1 focus:ring-[#cbfffc]"
                  />
                </div>

                <button
                  onClick={() =>
                    updateUserProfile({
                      fullName: profileNameInput,
                      paypalEmail: claimPayPalEmail,
                    })
                  }
                  className="auros-btn-aurora px-6 py-3.5 cursor-pointer"
                >
                  Save Payout Settings to Supabase
                </button>
              </div>

              <div className="rounded-[16px] bg-[#011d1c] p-8 space-y-3">
                <div className="flex items-center gap-2.5 text-[#cbfffc]">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="auros-caption text-[#edfffe]">
                    Active PostgreSQL Row-Level Security Policy
                  </span>
                </div>
                <p className="text-sm text-[#bbc7c6] leading-[1.65]">
                  Your Freelancer account (<code>{currentUser.email}</code>) can
                  only view contracts where{" "}
                  <code>auth.uid() = freelancer_id</code> or{" "}
                  <code>
                    lower(invited_freelancer_email) = lower(auth.jwt() -&gt;&gt;
                    &apos;email&apos;)
                  </code>
                  . Contracts belonging to other freelancers are blocked at the
                  PostgreSQL row level.
                </p>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

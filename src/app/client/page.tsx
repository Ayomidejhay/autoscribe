"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  GitCommit,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Bot,
  UserCheck,
  Plus,
  ArrowUpRight,
  Copy,
  FileText,
  FolderPlus,
  Loader2,
  ShieldCheck,
  Users,
  Trash2,
  RotateCcw,
  RefreshCw,
  Pencil,
  Code2,
  Palette,
  Database,
  Package,
} from "lucide-react";
import { useAutoScribe } from "@/context/AutoScribeStore";
import { Milestone, MilestoneStatus, Project } from "@/types/autoscribe";
import {
  DashboardSidebar,
  ClientDashboardSection,
} from "@/components/DashboardSidebar";
import { PayPalCheckoutModal } from "@/components/PayPalCheckoutModal";
import { AgentLiveTerminal } from "@/components/AgentLiveTerminal";
import { NewMilestoneModal } from "@/components/NewMilestoneModal";
import { EditMilestoneModal } from "@/components/EditMilestoneModal";
import { NewProjectInviteModal } from "@/components/NewProjectInviteModal";
import { MolecularDiagram } from "@/components/MolecularDiagram";

function getDeliverableCategoryMeta(type?: string) {
  switch (type) {
    case "design":
      return { label: "Design", icon: Palette, color: "text-[#fde9ff] bg-[#260b1e] border-[#fde9ff]/30" };
    case "content":
      return { label: "Content", icon: FileText, color: "text-[#ffeaa7] bg-[#2d2407] border-[#ffeaa7]/30" };
    case "data":
      return { label: "Data", icon: Database, color: "text-[#70a1ff] bg-[#0c1c38] border-[#70a1ff]/30" };
    case "general":
      return { label: "Deliverable", icon: Package, color: "text-[#a8ffb2] bg-[#0d2a14] border-[#a8ffb2]/30" };
    default:
      return { label: "Code", icon: Code2, color: "text-[#cbfffc] bg-[#011d1c] border-[#cbfffc]/30" };
  }
}

export default function ClientDashboardPage() {
  const {
    isLoadingAuth,
    currentUser,
    visibleProjects,
    milestones,
    transactions,
    logsByMilestone,
    updateUserProfile,
    createProject,
    createMilestone,
    updateMilestone,
    deleteProject,
    deleteMilestone,
    toggleReleaseMode,
    fundMilestone,
    releaseCopilotPayout,
    resetDisputedMilestone,
    refundDisputedMilestone,
  } = useAutoScribe();

  const [activeSection, setActiveSection] =
    useState<ClientDashboardSection>("overview");
  const [freelancerFilter, setFreelancerFilter] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("");
  const [rightPanelTab, setRightPanelTab] = useState<"telemetry" | "ledger">(
    "telemetry"
  );

  const [fundingMilestone, setFundingMilestone] = useState<Milestone | null>(
    null
  );
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null
  );
  const [isNewMilestoneOpen, setIsNewMilestoneOpen] = useState<boolean>(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState<boolean>(false);
  const [isProcessingDispute, setIsProcessingDispute] = useState<boolean>(false);
  const [profileNameInput, setProfileNameInput] = useState<string>("");

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
            Sign in to access your Client Dashboard
          </h1>
          <p className="text-[16px] text-[#bbc7c6] leading-[1.65]">
            Your escrow contracts, milestone rubrics, and PayPal ledger are
            protected by Supabase Row-Level Security (`auth.uid() = client_id`).
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
              Create Client Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const distinctFreelancers = Array.from(
    new Set(
      visibleProjects.map((p) => p.invited_freelancer_email.toLowerCase())
    )
  );

  const filteredProjects =
    freelancerFilter === "all"
      ? visibleProjects
      : visibleProjects.filter(
          (p) =>
            p.invited_freelancer_email.toLowerCase() ===
            freelancerFilter.toLowerCase()
        );

  const activeProject =
    filteredProjects.find((p) => p.id === selectedProjectId) ||
    filteredProjects[0] ||
    visibleProjects[0];

  const projectMilestones = activeProject
    ? milestones.filter((m) => m.project_id === activeProject.id)
    : [];

  const selectedMilestone =
    projectMilestones.find((m) => m.id === selectedMilestoneId) ||
    projectMilestones[0];

  const projectTransactions = activeProject
    ? transactions.filter(
        (t) =>
          t.project_id === activeProject.id ||
          projectMilestones.some((m) => m.id === t.milestone_id)
      )
    : [];

  const activeMilestoneLogs = selectedMilestone
    ? logsByMilestone[selectedMilestone.id] || []
    : [];

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    const firstMs = milestones.find((m) => m.project_id === projectId);
    if (firstMs) {
      setSelectedMilestoneId(firstMs.id);
    }
  };

  // Portfolio-wide totals
  const portfolioTotalBudget = milestones.reduce((sum, m) => sum + m.amount, 0);
  const portfolioLockedEscrow = milestones
    .filter((m) =>
      [
        "funded",
        "submitted",
        "verifying",
        "verified",
        "revision_requested",
        "disputed",
      ].includes(m.status)
    )
    .reduce((sum, m) => sum + m.amount, 0);
  const portfolioDisbursed = milestones
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + m.amount, 0);

  // Active contract totals
  const totalBudget = projectMilestones.reduce((sum, m) => sum + m.amount, 0);
  const lockedInEscrow = projectMilestones
    .filter((m) =>
      [
        "funded",
        "submitted",
        "verifying",
        "verified",
        "revision_requested",
        "disputed",
      ].includes(m.status)
    )
    .reduce((sum, m) => sum + m.amount, 0);
  const totalDisbursed = projectMilestones
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + m.amount, 0);

  const getStatusBadge = (status: MilestoneStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#cbfffc]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid via PayPal
          </span>
        );
      case "verified":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#edfffe]">
            <Sparkles className="w-3.5 h-3.5 text-[#cbfffc]" />
            Verified • Co-Pilot Ready
          </span>
        );
      case "verifying":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] text-[11px] uppercase tracking-[0.13em] font-medium bg-[#011d1c] text-[#fde9ff] animate-pulse">
            <Bot className="w-3.5 h-3.5" />
            Verifying Diff...
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
            Escrow Funded
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
            Pending Deposit
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#012624] text-[#bbc7c6] flex flex-col lg:flex-row">
      {/* Left Sidebar Navigation */}
      <DashboardSidebar
        portalType="client"
        activeSection={activeSection}
        onSelectSection={(s) => setActiveSection(s as ClientDashboardSection)}
        projects={visibleProjects}
        activeProjectId={activeProject?.id}
        onSelectProject={(projectId) => handleSelectProject(projectId)}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
      />

      {/* Right Main Dashboard Content Area */}
      <div className="flex-1 min-w-0">
        {/* SECTION 1: OVERVIEW */}
        {activeSection === "overview" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-14">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/[0.07]">
              <div className="space-y-3">
                <span className="auros-kicker block">
                  Client Command Overview // {currentUser.name}
                </span>
                <h1 className="auros-display text-[40px] sm:text-[52px]">
                  Escrow Portfolio
                </h1>
              </div>

              <button
                onClick={() => setIsNewProjectOpen(true)}
                className="auros-btn-aurora px-6 py-3.5 flex items-center gap-2.5 self-start md:self-auto cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Initiate New Contract</span>
              </button>
            </div>

            {/* 3-Column Portfolio KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              <div className="rounded-[16px] bg-[#003734] p-8 space-y-3">
                <span className="auros-caption text-[#edfffe] block">
                  TOTAL PORTFOLIO SCOPE
                </span>
                <div className="auros-stat text-[44px] sm:text-[52px]">
                  $
                  {portfolioTotalBudget.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-[#bbc7c6]">
                  Across {visibleProjects.length} active contract
                  {visibleProjects.length === 1 ? "" : "s"} &amp;{" "}
                  {distinctFreelancers.length} freelancer
                  {distinctFreelancers.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-[16px] bg-[#003734] p-8 space-y-3">
                <span className="auros-caption text-[#edfffe] block">
                  CUSTODIAL PAYPAL VAULT (LOCKED)
                </span>
                <div className="auros-stat text-[44px] sm:text-[52px]">
                  $
                  {portfolioLockedEscrow.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-[#bbc7c6]">
                  Captured via PayPal Orders API v2
                </p>
              </div>

              <div className="rounded-[16px] bg-[#003734] p-8 space-y-3">
                <span className="auros-caption text-[#edfffe] block">
                  DISBURSED VIA PAYPAL PAYOUTS
                </span>
                <div className="auros-stat text-[44px] sm:text-[52px]">
                  $
                  {portfolioDisbursed.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-[#bbc7c6]">
                  Released after deterministic AI diff verification
                </p>
              </div>
            </div>

            {/* Contracts List or Empty State */}
            {visibleProjects.length === 0 ? (
              <div className="rounded-[16px] bg-[#003734] p-12 space-y-6">
                <span className="auros-kicker block">
                  Zero Active Contracts in Supabase
                </span>
                <h2 className="auros-heading text-[32px]">
                  Create your first autonomous escrow contract
                </h2>
                <p className="text-[16px] text-[#bbc7c6] max-w-2xl leading-[1.65]">
                  Define your project brief, let the AI Agent decompose it into
                  measurable milestones, and invite a Freelancer by email.
                </p>
                <button
                  onClick={() => setIsNewProjectOpen(true)}
                  className="auros-btn-aurora px-7 py-4 flex items-center gap-2.5 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Initiate First Escrow Contract</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="auros-heading text-[26px]">
                    Active Escrow Contracts ({visibleProjects.length})
                  </h2>
                  <button
                    onClick={() => setActiveSection("contracts")}
                    className="text-xs font-mono uppercase tracking-[0.12em] text-[#cbfffc] hover:underline cursor-pointer"
                  >
                    Open Milestones Workspace →
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
                    const catMeta = getDeliverableCategoryMeta(proj.deliverable_type);
                    const CategoryIcon = catMeta.icon;

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
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-[6px] text-[10px] uppercase tracking-[0.13em] ${
                                  proj.invite_status === "pending_invite"
                                    ? "bg-[#012624] text-[#fde9ff]"
                                    : "bg-[#012624] text-[#cbfffc]"
                                }`}
                              >
                                {proj.invite_status === "pending_invite"
                                  ? "Invite Pending"
                                  : "Bound Contract"}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] uppercase font-mono tracking-wider border ${catMeta.color}`}>
                                <CategoryIcon className="w-3 h-3" />
                                {catMeta.label}
                              </span>
                            </div>
                            <span className="font-mono text-sm text-[#fde9ff]">
                              $
                              {proj.total_budget.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(proj);
                              }}
                              title="Delete contract"
                              className="p-1.5 rounded-[6px] bg-[#011d1c] hover:bg-[#260b12] text-[#bbc7c6] hover:text-[#ff6b81] border border-white/10 hover:border-[#ff6b81]/50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                            <span className="text-[#bbc7c6]">Contractor</span>
                            <span className="font-mono text-[#edfffe] truncate max-w-[180px]">
                              {proj.invited_freelancer_email}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#bbc7c6]">Milestones</span>
                            <span className="font-mono text-[#cbfffc]">
                              {paidCount}/{projMs.length} Settled
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

        {/* SECTION 2: CONTRACTS & MILESTONES WORKSPACE */}
        {activeSection === "contracts" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-14">
            {visibleProjects.length === 0 ? (
              <div className="rounded-[16px] bg-[#003734] p-12 space-y-6">
                <span className="auros-kicker block">No Contracts Yet</span>
                <h1 className="auros-heading text-[36px]">
                  Initiate your first escrow contract
                </h1>
                <p className="text-[16px] text-[#bbc7c6] max-w-xl">
                  Click below to create a contract in Supabase and invite a
                  freelancer by email.
                </p>
                <button
                  onClick={() => setIsNewProjectOpen(true)}
                  className="auros-btn-aurora px-7 py-4 flex items-center gap-2.5 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>New Escrow Contract</span>
                </button>
              </div>
            ) : (
              <>
                {/* Top Filter Bar & Contract Selector */}
                <div className="space-y-8 pb-10 border-b border-white/[0.07]">
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="space-y-2">
                      <span className="auros-kicker block">
                        Contracts &amp; Milestones // Multi-Freelancer Isolation
                      </span>
                      <h1 className="auros-display text-[36px] sm:text-[46px]">
                        {activeProject?.title}
                      </h1>
                    </div>

                    {/* Freelancer Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2 bg-[#011d1c] p-2 rounded-[8px]">
                      <button
                        onClick={() => setFreelancerFilter("all")}
                        className={`px-3.5 py-2 rounded-[6px] text-[11px] uppercase tracking-[0.12em] cursor-pointer transition-colors ${
                          freelancerFilter === "all"
                            ? "bg-[#003734] text-white font-medium"
                            : "text-[#bbc7c6] hover:text-white"
                        }`}
                      >
                        All ({visibleProjects.length})
                      </button>
                      {distinctFreelancers.map((email) => (
                        <button
                          key={email}
                          onClick={() => {
                            setFreelancerFilter(email);
                            const firstMatch = visibleProjects.find(
                              (p) =>
                                p.invited_freelancer_email.toLowerCase() ===
                                email.toLowerCase()
                            );
                            if (firstMatch) handleSelectProject(firstMatch.id);
                          }}
                          className={`px-3.5 py-2 rounded-[6px] text-xs font-mono cursor-pointer transition-colors ${
                            freelancerFilter === email
                              ? "bg-[#003734] text-[#cbfffc]"
                              : "text-[#bbc7c6] hover:text-white"
                          }`}
                        >
                          {email}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Contract Summary Strip */}
                  {activeProject && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
                      <div className="rounded-[12px] bg-[#011d1c] p-6 space-y-1.5">
                        <span className="auros-caption">CONTRACT BUDGET</span>
                        <div className="auros-stat text-[36px]">
                          $
                          {totalBudget.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className="rounded-[12px] bg-[#011d1c] p-6 space-y-1.5">
                        <span className="auros-caption">
                          LOCKED IN PAYPAL ESCROW
                        </span>
                        <div className="auros-stat text-[36px]">
                          $
                          {lockedInEscrow.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className="rounded-[12px] bg-[#011d1c] p-6 space-y-1.5">
                        <span className="auros-caption">
                          SETTLED TO FREELANCER
                        </span>
                        <div className="auros-stat text-[36px]">
                          $
                          {totalDisbursed.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {activeProject && (
                  <div className="space-y-12">
                    {/* Pending Invite Banner */}
                    {activeProject.invite_status === "pending_invite" && (
                      <section className="rounded-[20px] bg-gradient-to-r from-[#003734] via-[#012d2b] to-[#011d1c] p-8 sm:p-9 border border-[#cbfffc]/20 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                        <div className="space-y-2.5 max-w-2xl relative z-10">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-mono uppercase tracking-[0.14em] bg-[#011d1c] text-[#fde9ff] border border-[#fde9ff]/30">
                              <Sparkles className="w-3 h-3 text-[#fde9ff]" />
                              Invitation Handshake Pending
                            </span>
                            <span className="text-xs font-mono text-[#cbfffc]">
                              Target: {activeProject.invited_freelancer_email}
                            </span>
                          </div>
                          <h2 className="text-[26px] sm:text-[30px] font-medium text-white tracking-[-0.02em] leading-[1.2]">
                            Waiting for contractor to accept &ldquo;{activeProject.title}&rdquo;
                          </h2>
                          <p className="text-sm text-[#bbc7c6] leading-[1.6]">
                            Share this private invite link with your contractor. Once they sign in with{" "}
                            <code className="text-[#cbfffc] bg-[#011d1c] px-1.5 py-0.5 rounded">
                              {activeProject.invited_freelancer_email}
                            </code>
                            , PostgreSQL automatically binds their account, locks escrow security, and unlocks GitHub verification.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                `${window.location.origin}/signup?invite=${activeProject.invite_token}&email=${encodeURIComponent(activeProject.invited_freelancer_email)}`
                              );
                              toast.success(
                                `Copied invitation link for ${activeProject.invited_freelancer_email} to clipboard!`
                              );
                            }}
                            className="px-6 py-4 rounded-[10px] bg-[#003734] hover:bg-[#00827c]/40 text-[12px] uppercase tracking-[0.12em] font-medium text-white border border-[#cbfffc]/40 flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-sm"
                          >
                            <Copy className="w-4 h-4 text-[#cbfffc]" />
                            <span>Copy Freelancer Invite Link</span>
                          </button>
                        </div>
                      </section>
                    )}

                    {/* Contract Subheader */}
                    {(() => {
                      const activeCatMeta = getDeliverableCategoryMeta(activeProject.deliverable_type);
                      const ActiveCategoryIcon = activeCatMeta.icon;

                      return (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] uppercase font-mono tracking-wider border ${activeCatMeta.color}`}>
                              <ActiveCategoryIcon className="w-3.5 h-3.5" />
                              {activeCatMeta.label}
                            </span>
                            <span className="auros-kicker">
                              Contractor: {activeProject.freelancer_name} (
                              {activeProject.invited_freelancer_email})
                            </span>
                            <span className="text-[#707777]">•</span>
                            <a
                              href={activeProject.repo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-xs text-[#cbfffc] hover:underline flex items-center gap-1.5"
                            >
                              <ActiveCategoryIcon className="w-3.5 h-3.5" />
                              {activeProject.repo_url.replace(/^https?:\/\/(www\.)?(github\.com\/)?/, "")}
                            </a>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => setProjectToDelete(activeProject)}
                              className="px-4 py-3 rounded-[6px] bg-[#011d1c] hover:bg-[#260b12] border border-white/10 hover:border-[#ff6b81]/50 text-[11px] uppercase tracking-[0.12em] text-[#ff8597] font-medium flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete Contract</span>
                            </button>

                            <button
                              onClick={() => setIsNewMilestoneOpen(true)}
                              className="px-5 py-3 rounded-[6px] bg-[#003734] hover:bg-[#00827c]/40 text-[11px] uppercase tracking-[0.12em] text-white font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <Plus className="w-4 h-4 text-[#cbfffc]" />
                              <span>Append Milestone</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2-Column Workspace: Milestones (Left) + AI Telemetry & Ledger (Right) */}
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
                                      ? "Autonomous (≥90%)"
                                      : "Co-Pilot"}
                                  </span>
                                  {ms.status !== "paid" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingMilestone(ms);
                                      }}
                                      className="px-2.5 py-1 rounded-[6px] bg-[#011d1c] hover:bg-[#003734] border border-white/10 hover:border-[#cbfffc]/40 text-[#cbfffc] text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Edit Milestone & Acceptance Criteria"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      <span>Edit Rubric</span>
                                    </button>
                                  )}
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
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                      <span className="auros-caption text-[#edfffe]">
                                        Acceptance Criteria (
                                        {
                                          ms.acceptance_criteria.filter(
                                            (c) => c.passed === true
                                          ).length
                                        }
                                        /{ms.acceptance_criteria.length} Passed)
                                      </span>

                                      {ms.status !== "paid" && (
                                        <div
                                          className="flex items-center gap-1.5 bg-[#011d1c] p-1.5 rounded-[6px]"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={() =>
                                              toggleReleaseMode(
                                                ms.id,
                                                "autonomous"
                                              )
                                            }
                                            className={`px-3 py-1 rounded-[4px] text-[10px] uppercase tracking-[0.12em] cursor-pointer ${
                                              ms.release_mode === "autonomous"
                                                ? "bg-[#003734] text-white font-medium"
                                                : "text-[#bbc7c6]"
                                            }`}
                                          >
                                            Auto Payout
                                          </button>
                                          <button
                                            onClick={() =>
                                              toggleReleaseMode(
                                                ms.id,
                                                "copilot"
                                              )
                                            }
                                            className={`px-3 py-1 rounded-[4px] text-[10px] uppercase tracking-[0.12em] cursor-pointer ${
                                              ms.release_mode === "copilot"
                                                ? "bg-[#003734] text-white font-medium"
                                                : "text-[#bbc7c6]"
                                            }`}
                                          >
                                            Co-Pilot
                                          </button>
                                          {ms.status === "pending" && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                deleteMilestone(ms.id)
                                              }
                                              title="Delete pending milestone"
                                              className="px-2 py-1 rounded-[4px] text-[#bbc7c6] hover:text-[#ff6b81] hover:bg-[#260b12]/60 transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="divide-y divide-white/[0.07] rounded-[12px] bg-[#012624] px-6 py-2">
                                      {ms.acceptance_criteria.map(
                                        (criterion) => (
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
                                                      : criterion.passed ===
                                                        false
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
                                        )
                                      )}
                                    </div>
                                  </div>

                                  {ms.plain_english_summary &&
                                    ms.plain_english_summary.length > 0 && (
                                      <div className="rounded-[12px] bg-[#011d1c] p-6 space-y-3">
                                        <div className="flex items-center gap-2.5">
                                          <FileText className="w-4 h-4 text-[#cbfffc]" />
                                          <span className="auros-caption text-[#edfffe]">
                                            Plain-English Executive Summary
                                          </span>
                                        </div>
                                        <ul className="space-y-2 text-[14px] text-[#bbc7c6] list-disc list-inside leading-[1.6]">
                                          {ms.plain_english_summary.map(
                                            (bullet, idx) => (
                                              <li key={idx}>{bullet}</li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    )}

                                  <div onClick={(e) => e.stopPropagation()}>
                                    {ms.status === "pending" && (
                                      <div className="flex flex-wrap items-center justify-between gap-6 bg-[#011d1c] rounded-[12px] p-6">
                                        <div className="space-y-1">
                                          <span className="auros-caption text-[#edfffe] block">
                                            Fund Milestone Escrow
                                          </span>
                                          <p className="text-sm text-[#bbc7c6]">
                                            Deposit ${ms.amount.toFixed(2)} via
                                            PayPal Orders API v2 to unlock
                                            delivery.
                                          </p>
                                        </div>
                                        <button
                                          onClick={() =>
                                            setFundingMilestone(ms)
                                          }
                                          className="auros-btn-aurora px-6 py-3.5 flex items-center gap-2.5 cursor-pointer shrink-0"
                                        >
                                          <span>
                                            Fund ${ms.amount.toFixed(2)} Escrow
                                          </span>
                                          <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}

                                    {ms.status === "verified" && (
                                      <div className="flex flex-wrap items-center justify-between gap-6 bg-[#011d1c] rounded-[12px] p-6">
                                        <div className="space-y-1">
                                          <span className="auros-caption text-[#cbfffc] block">
                                            Co-Pilot Sign-Off Ready (
                                            {ms.ai_confidence_score}%
                                            Confidence)
                                          </span>
                                          <p className="text-sm text-[#bbc7c6]">
                                            Authorize 1-click PayPal Payout to{" "}
                                            {activeProject.freelancer_paypal_email ||
                                              activeProject.invited_freelancer_email}
                                            .
                                          </p>
                                        </div>
                                        <button
                                          onClick={() =>
                                            releaseCopilotPayout(
                                              ms,
                                              activeProject
                                            )
                                          }
                                          className="auros-btn-aurora px-6 py-3.5 flex items-center gap-2.5 cursor-pointer"
                                        >
                                          <UserCheck className="w-4 h-4" />
                                          <span>
                                            Dispatch ${ms.amount.toFixed(2)}{" "}
                                            Payout
                                          </span>
                                        </button>
                                      </div>
                                    )}

                                    {ms.status === "disputed" && (
                                      <div className="flex flex-col gap-4 bg-[#260b12]/60 border border-[#ff6b81]/40 rounded-[12px] p-6">
                                        <div className="flex items-center gap-2.5 text-[#ff8597]">
                                          <AlertTriangle className="w-4 h-4 shrink-0" />
                                          <span className="auros-caption text-[#ff8597]">
                                            Escrow Security Freeze // Adversarial Attempt or Dispute
                                          </span>
                                        </div>
                                        <p className="text-sm text-[#bbc7c6] leading-[1.6]">
                                          The AI security agent halted payouts for this milestone. Escrow funds ($
                                          {ms.amount.toFixed(2)}) remain safely locked in the PayPal vault. You can either unlock this milestone so the freelancer can resubmit clean code, or refund the deposit back to your account.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 pt-2">
                                          <button
                                            disabled={isProcessingDispute}
                                            onClick={async () => {
                                              setIsProcessingDispute(true);
                                              try {
                                                await resetDisputedMilestone(ms.id);
                                              } finally {
                                                setIsProcessingDispute(false);
                                              }
                                            }}
                                            className="px-4 py-3 rounded-[8px] bg-[#003734] hover:bg-[#00827c]/60 text-white text-[11px] uppercase tracking-[0.12em] font-medium flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5 text-[#cbfffc]" />
                                            <span>Unlock &amp; Allow Resubmission</span>
                                          </button>
                                          <button
                                            disabled={isProcessingDispute}
                                            onClick={async () => {
                                              setIsProcessingDispute(true);
                                              try {
                                                await refundDisputedMilestone(ms, activeProject.id);
                                              } finally {
                                                setIsProcessingDispute(false);
                                              }
                                            }}
                                            className="px-4 py-3 rounded-[8px] bg-[#ff6b81] hover:bg-[#ff8597] text-[#1a0509] font-semibold text-[11px] uppercase tracking-[0.12em] flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span>Refund ${ms.amount.toFixed(2)} Escrow to Client</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
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
                            logs={activeMilestoneLogs}
                            isRunning={false}
                            activeStepIndex={activeMilestoneLogs.length}
                          />
                        ) : (
                          <div className="rounded-[16px] bg-[#003734] p-8 space-y-6">
                            <div className="flex items-center justify-between">
                              <span className="auros-kicker">
                                PayPal Settlement Ledger
                              </span>
                              <span className="auros-caption">
                                Orders v2 + Payouts v1
                              </span>
                            </div>

                            {projectTransactions.length === 0 ? (
                              <p className="text-sm text-[#bbc7c6] py-8 text-center">
                                No PayPal transactions recorded for this
                                contract yet.
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
                                          {tx.milestone_title ||
                                            tx.milestone_id}
                                        </p>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="auros-stat text-[24px] block">
                                          {tx.type === "payout" ? "-" : "+"}$
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
                  </div>
                )}
              </>
            )}
          </main>
        )}

        {/* SECTION 3: FREELANCERS DIRECTORY */}
        {activeSection === "freelancers" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="space-y-3">
                <span className="auros-kicker block">
                  Contractor Directory // Supabase RLS Scoped
                </span>
                <h1 className="auros-display text-[40px] sm:text-[52px]">
                  Invited Freelancers
                </h1>
              </div>

              <button
                onClick={() => setIsNewProjectOpen(true)}
                className="auros-btn-aurora px-6 py-3.5 flex items-center gap-2.5 self-start sm:self-auto cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Invite Freelancer to Contract</span>
              </button>
            </div>

            {distinctFreelancers.length === 0 ? (
              <div className="rounded-[16px] bg-[#003734] p-12 text-center space-y-4">
                <p className="text-lg text-white">
                  No freelancers invited yet.
                </p>
                <p className="text-sm text-[#bbc7c6]">
                  Initiate a new contract to invite a freelancer by email.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                {distinctFreelancers.map((email) => {
                  const contractorProjects = visibleProjects.filter(
                    (p) =>
                      p.invited_freelancer_email.toLowerCase() ===
                      email.toLowerCase()
                  );
                  const totalContractorBudget = contractorProjects.reduce(
                    (s, p) => s + p.total_budget,
                    0
                  );
                  const sampleProj = contractorProjects[0];

                  return (
                    <div
                      key={email}
                      className="rounded-[16px] bg-[#003734] p-8 space-y-6 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="auros-caption text-[#cbfffc]">
                            {sampleProj?.invite_status === "accepted"
                              ? "Bound Contractor"
                              : "Pending Invite Acceptance"}
                          </span>
                          <span className="font-mono text-xs text-[#edfffe]">
                            {contractorProjects.length} Contract
                            {contractorProjects.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        <h3 className="text-2xl font-medium text-white">
                          {sampleProj?.freelancer_name || email}
                        </h3>
                        <p className="font-mono text-sm text-[#cbfffc]">
                          {email}
                        </p>
                      </div>

                      <div className="pt-5 border-t border-white/[0.08] flex items-center justify-between">
                        <div>
                          <span className="auros-caption block">
                            ALLOCATED ESCROW
                          </span>
                          <span className="auros-stat text-[28px]">
                            $
                            {totalContractorBudget.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setFreelancerFilter(email);
                            if (sampleProj) handleSelectProject(sampleProj.id);
                            setActiveSection("contracts");
                          }}
                          className="px-4 py-2.5 rounded-[6px] bg-[#011d1c] hover:bg-[#012624] text-xs uppercase tracking-[0.12em] text-white cursor-pointer"
                        >
                          View Contracts →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* SECTION 4: FULL PAYPAL ESCROW LEDGER */}
        {activeSection === "ledger" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-12">
            <div className="space-y-3">
              <span className="auros-kicker block">
                Auditable PayPal Sandbox Ledger // Supabase
                `public.transactions`
              </span>
              <h1 className="auros-display text-[40px] sm:text-[52px]">
                Escrow Deposits &amp; Payouts
              </h1>
              <p className="text-[18px] text-[#bbc7c6] max-w-2xl">
                Every PayPal Order capture and autonomous PayPal Payout batch ID
                persisted in your Supabase PostgreSQL ledger.
              </p>
            </div>

            <div className="rounded-[16px] bg-[#003734] p-10 space-y-6">
              {transactions.length === 0 ? (
                <p className="text-base text-[#bbc7c6] py-12 text-center">
                  No transactions recorded yet. Fund a milestone in the
                  Contracts &amp; Milestones section to record your first PayPal
                  Order capture.
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
                              : "PayPal Order v2"}
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
                            Recipient: {tx.recipient_paypal_email}
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="auros-stat text-[32px] block">
                          {tx.type === "payout" ? "-" : "+"}$
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

        {/* SECTION 5: ACCOUNT & RLS SETTINGS */}
        {activeSection === "settings" && (
          <main className="max-w-[1320px] mx-auto px-8 lg:px-14 py-14 space-y-12">
            <div className="max-w-2xl space-y-10">
              <div className="space-y-3">
                <span className="auros-kicker block">
                  Supabase Profile &amp; Row-Level Security
                </span>
                <h1 className="auros-display text-[40px]">Client Identity</h1>
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
                    AUTHENTICATED EMAIL
                  </label>
                  <div className="rounded-[8px] bg-[#011d1c] px-4 py-3 font-mono text-sm text-white">
                    {currentUser.email}
                  </div>
                </div>

                <div>
                  <label className="auros-caption block mb-2">
                    ORGANIZATION / CLIENT NAME
                  </label>
                  <input
                    type="text"
                    defaultValue={currentUser.name}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    className="w-full rounded-[8px] bg-[#011d1c] px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#cbfffc]"
                  />
                </div>

                <button
                  onClick={() =>
                    updateUserProfile({
                      fullName: profileNameInput || currentUser.name,
                    })
                  }
                  className="auros-btn-aurora px-6 py-3.5 cursor-pointer"
                >
                  Save Profile to Supabase
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
                  Your Client account (<code>{currentUser.email}</code>) can
                  view all contracts where <code>auth.uid() = client_id</code>.
                  Each invited freelancer can only query the specific contract
                  rows where their authenticated email matches{" "}
                  <code>invited_freelancer_email</code>.
                </p>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Modals */}
      {activeProject && (
        <>
          <PayPalCheckoutModal
            milestone={fundingMilestone}
            clientEmail={activeProject.client_email}
            onClose={() => setFundingMilestone(null)}
            onConfirmFunding={(ms) => fundMilestone(ms, activeProject.id)}
          />

          <NewMilestoneModal
            isOpen={isNewMilestoneOpen}
            projectId={activeProject.id}
            onClose={() => setIsNewMilestoneOpen(false)}
            onCreateMilestone={async (newMs) => {
              const created = await createMilestone(newMs);
              if (created) {
                setSelectedMilestoneId(created.id);
                toast.success(`Appended "${created.title}" in Supabase.`);
              }
            }}
          />

          <EditMilestoneModal
            isOpen={Boolean(editingMilestone)}
            milestone={editingMilestone}
            onClose={() => setEditingMilestone(null)}
            onSave={async (milestoneId, updates) => {
              return await updateMilestone(milestoneId, updates);
            }}
          />
        </>
      )}

      <NewProjectInviteModal
        isOpen={isNewProjectOpen}
        clientUser={{
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
        }}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={async (newProj, initialMilestones) => {
          const created = await createProject(newProj, initialMilestones);
          if (created) {
            setFreelancerFilter("all");
            setSelectedProjectId(created.id);
            setActiveSection("contracts");
            toast.success(
              `Created "${created.title}" in Supabase & invited ${created.invited_freelancer_email}.`
            );
          }
        }}
      />

      {/* Delete Contract Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#011d1c]/90 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-md rounded-[16px] border border-[#ff6b81]/40 bg-[#003734] overflow-hidden shadow-[0_24px_64px_-24px_rgba(0,0,0,0.75)]"
            >
              <div className="px-7 py-5 bg-[#260b12]/80 border-b border-[#ff6b81]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[#ff8597]">
                  <Trash2 className="w-4 h-4" />
                  <span className="auros-caption text-[#ff8597]">
                    PERMANENT CONTRACT DELETION
                  </span>
                </div>
              </div>

              <div className="p-7 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-[22px] font-medium text-white leading-[1.25]">
                    Delete &ldquo;{projectToDelete.title}&rdquo;?
                  </h3>
                  <p className="text-sm text-[#bbc7c6] leading-[1.6]">
                    This will permanently delete the contract invited to{" "}
                    <code className="text-white">
                      {projectToDelete.invited_freelancer_email}
                    </code>{" "}
                    along with all of its milestones and verification logs in
                    Supabase.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeletingProject}
                    onClick={() => setProjectToDelete(null)}
                    className="px-4 py-3 rounded-[8px] bg-[#011d1c] border border-white/10 text-[11px] uppercase tracking-[0.12em] text-[#bbc7c6] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingProject}
                    onClick={async () => {
                      setIsDeletingProject(true);
                      try {
                        const targetId = projectToDelete.id;
                        const ok = await deleteProject(targetId);
                        if (ok) {
                          setProjectToDelete(null);
                          if (selectedProjectId === targetId) {
                            setSelectedProjectId("");
                          }
                        }
                      } finally {
                        setIsDeletingProject(false);
                      }
                    }}
                    className="px-5 py-3 rounded-[8px] bg-[#ff6b81] hover:bg-[#ff8597] text-[#1a0509] font-semibold text-[11px] uppercase tracking-[0.12em] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingProject ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Contract</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Receipt,
  ShieldCheck,
  FolderPlus,
  RefreshCw,
  LogOut,
  Database,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAutoScribe } from "@/context/AutoScribeStore";
import { Project } from "@/types/autoscribe";

export type ClientDashboardSection =
  | "overview"
  | "contracts"
  | "freelancers"
  | "ledger"
  | "settings";

export type FreelancerDashboardSection =
  | "overview"
  | "contracts"
  | "ledger"
  | "settings";

interface DashboardSidebarProps {
  portalType: "client" | "freelancer";
  activeSection: string;
  onSelectSection: (section: string) => void;
  projects: Project[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onOpenNewProject?: () => void;
}

export function DashboardSidebar({
  portalType,
  activeSection,
  onSelectSection,
  projects,
  activeProjectId,
  onSelectProject,
  onOpenNewProject,
}: DashboardSidebarProps) {
  const router = useRouter();
  const {
    currentUser,
    isSupabaseReady,
    isLoadingData,
    refreshLiveData,
    logout,
  } = useAutoScribe();

  const [mobileOpen, setMobileOpen] = useState(false);

  const clientNavItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "contracts",
      label: "Contracts & Milestones",
      icon: FolderKanban,
      badge: projects.length,
    },
    {
      id: "freelancers",
      label: "Freelancers",
      icon: Users,
      badge: Array.from(
        new Set(projects.map((p) => p.invited_freelancer_email.toLowerCase()))
      ).length,
    },
    {
      id: "ledger",
      label: "PayPal Ledger",
      icon: Receipt,
    },
    {
      id: "settings",
      label: "Account & RLS",
      icon: ShieldCheck,
    },
  ];

  const pendingInvitesCount = projects.filter(
    (p) => p.invite_status === "pending_invite"
  ).length;

  const freelancerNavItems = [
    {
      id: "overview",
      label: "Overview & Earnings",
      icon: LayoutDashboard,
      badge: pendingInvitesCount > 0 ? `${pendingInvitesCount} new` : undefined,
    },
    {
      id: "contracts",
      label: "Assigned Contracts",
      icon: FolderKanban,
      badge: projects.length,
    },
    {
      id: "ledger",
      label: "PayPal Payouts",
      icon: Receipt,
    },
    {
      id: "settings",
      label: "Payout & RLS Settings",
      icon: ShieldCheck,
    },
  ];

  const navItems =
    portalType === "client" ? clientNavItems : freelancerNavItems;

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AS";

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-[#011d1c] border-r border-white/[0.07] text-[#bbc7c6] w-[290px] shrink-0 select-none">
      {/* Top: Brand + Primary Action + Navigation */}
      <div className="p-6 space-y-7 overflow-y-auto">
        {/* Brand Identity */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#003734] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#cbfffc]" />
            </div>
            <div>
              <span className="text-[19px] font-medium tracking-[-0.025em] text-white block leading-none">
                AutoScribe
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#cbfffc] block mt-1">
                {portalType === "client"
                  ? "Client Command"
                  : "Freelancer Workspace"}
              </span>
            </div>
          </Link>

          <button
            onClick={() => refreshLiveData()}
            disabled={isLoadingData}
            title="Sync with Supabase"
            className="w-8 h-8 rounded-[6px] bg-[#012624] hover:bg-[#003734] flex items-center justify-center text-[#cbfffc] transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingData ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Primary CTA for Client */}
        {portalType === "client" && onOpenNewProject && (
          <button
            onClick={() => {
              onOpenNewProject();
              setMobileOpen(false);
            }}
            className="auros-btn-aurora w-full py-3.5 px-4 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Escrow Contract</span>
          </button>
        )}

        {/* Main Navigation Menu */}
        <div className="space-y-1.5">
          <span className="px-3 text-[10px] font-mono uppercase tracking-[0.14em] text-[#707777] block mb-2.5">
            Navigation
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[8px] text-[14px] transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#003734] text-white font-medium"
                    : "text-[#bbc7c6] hover:bg-[#012624] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#cbfffc]" : "text-[#bbc7c6]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono ${
                      isActive
                        ? "bg-[#011d1c] text-[#cbfffc]"
                        : "bg-[#012624] text-[#bbc7c6]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Contract Switcher in Sidebar */}
        {projects.length > 0 && onSelectProject && (
          <div className="space-y-2 pt-3 border-t border-white/[0.06]">
            <div className="px-3 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#707777]">
                {portalType === "client"
                  ? "Active Contracts"
                  : "Assigned Contracts"}
              </span>
              <span className="text-[10px] font-mono text-[#bbc7c6]">
                {projects.length}
              </span>
            </div>

            <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
              {projects.map((proj) => {
                const isSelected =
                  proj.id === activeProjectId && activeSection === "contracts";
                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj.id);
                      onSelectSection("contracts");
                      setMobileOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-[8px] transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-[#012624] text-white ring-1 ring-[#cbfffc]/35"
                        : "text-[#bbc7c6] hover:bg-[#012624]/60 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {proj.title}
                      </p>
                      <p className="text-[11px] font-mono text-[#707777] truncate mt-0.5">
                        {portalType === "client"
                          ? proj.invited_freelancer_email
                          : proj.client_email}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? "text-[#cbfffc]" : "text-[#707777]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Supabase Status + Authenticated User Profile + Logout */}
      <div className="p-5 border-t border-white/[0.07] space-y-4 bg-[#011d1c]">
        <div className="flex items-center justify-between px-3 py-2 rounded-[6px] bg-[#012624]">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#cbfffc]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#edfffe]">
              {isSupabaseReady ? "Supabase Connected" : "Offline"}
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#cbfffc]" />
        </div>

        {currentUser && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[8px] bg-[#003734] text-[#cbfffc] font-mono text-xs font-medium flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-[11px] font-mono text-[#bbc7c6] truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              title="Sign Out"
              className="w-9 h-9 rounded-[8px] bg-[#012624] hover:bg-[#003734] text-[#edfffe] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#cbfffc]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Left Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Top Bar Toggle (Only visible on small screens to open the Sidebar Drawer) */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-[#011d1c] border-b border-white/[0.07]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-[#003734] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#cbfffc]" />
          </div>
          <span className="text-lg font-medium text-white">AutoScribe</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-[6px] bg-[#003734] text-white cursor-pointer"
          aria-label="Toggle sidebar menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}


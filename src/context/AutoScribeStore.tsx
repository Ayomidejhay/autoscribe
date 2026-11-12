"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import {
  AgentLogEntry,
  AuthenticatedUser,
  EscrowTransaction,
  Milestone,
  MilestoneStatus,
  Project,
  ReleaseMode,
} from "@/types/autoscribe";
import {
  getSupabaseBrowserClient,
  getSupabaseCredentials,
  saveRuntimeSupabaseCredentials,
} from "@/lib/supabase";
import {
  fundMilestoneAction,
  releaseCopilotPayoutAction,
  verifyAndPayoutMilestoneAction,
  resetDisputedMilestoneAction,
  refundDisputedMilestoneAction,
} from "@/app/actions/escrow";

interface AutoScribeContextValue {
  isSupabaseReady: boolean;
  isLoadingAuth: boolean;
  isLoadingData: boolean;
  currentUser: AuthenticatedUser | null;
  projects: Project[];
  visibleProjects: Project[];
  milestones: Milestone[];
  transactions: EscrowTransaction[];
  logsByMilestone: Record<string, AgentLogEntry[]>;
  connectSupabaseRuntime: (url: string, anonKey: string) => Promise<boolean>;
  signUpWithSupabase: (params: {
    fullName: string;
    email: string;
    password: string;
    role: "client" | "freelancer";
    paypalEmail?: string;
  }) => Promise<{ user: AuthenticatedUser | null; error?: string }>;
  signInWithSupabase: (params: {
    email: string;
    password: string;
  }) => Promise<{ user: AuthenticatedUser | null; error?: string }>;
  updateUserProfile: (params: {
    fullName?: string;
    paypalEmail?: string;
  }) => Promise<void>;
  refreshLiveData: () => Promise<void>;
  logout: () => Promise<void>;
  createProject: (
    project: Omit<Project, "id" | "created_at">,
    initialMilestones: Omit<Milestone, "id" | "project_id" | "created_at">[]
  ) => Promise<Project | null>;
  createMilestone: (
    milestone: Omit<Milestone, "id" | "created_at">
  ) => Promise<Milestone | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
  deleteMilestone: (milestoneId: string) => Promise<boolean>;
  acceptProjectInvite: (
    projectId: string,
    paypalEmail: string
  ) => Promise<void>;
  toggleReleaseMode: (
    milestoneId: string,
    mode: ReleaseMode
  ) => Promise<void>;
  fundMilestone: (milestone: Milestone, projectId: string) => Promise<void>;
  runAgentVerification: (params: {
    milestone: Milestone;
    project: Project;
    commitUrl: string;
    previewUrl: string;
    onStepProgress?: (stepIndex: number, allLogs: AgentLogEntry[]) => void;
  }) => Promise<void>;
  releaseCopilotPayout: (
    milestone: Milestone,
    project: Project
  ) => Promise<void>;
  resetDisputedMilestone: (milestoneId: string) => Promise<void>;
  refundDisputedMilestone: (
    milestone: Milestone,
    projectId: string
  ) => Promise<void>;
}

const AutoScribeContext = createContext<AutoScribeContextValue | null>(null);

export function AutoScribeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSupabaseReady, setIsSupabaseReady] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(
    null
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [logsByMilestone, setLogsByMilestone] = useState<
    Record<string, AgentLogEntry[]>
  >({});

  /**
   * Fetch all RLS-scoped Projects, Milestones, Transactions, and Agent Logs from Supabase
   */
  const fetchAllWorkspaceData = useCallback(
    async (user: AuthenticatedUser | null) => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !user) {
        setProjects([]);
        setMilestones([]);
        setTransactions([]);
        setLogsByMilestone({});
        return;
      }

      setIsLoadingData(true);
      try {
        // 1. Fetch projects (automatically scoped by Supabase RLS)
        const { data: projData, error: projErr } = await sb
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (projErr) {
          console.error("Supabase projects query error:", projErr.message);
        }

        const loadedProjects: Project[] = (projData || []).map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description || "",
          repo_url: p.repo_url || "https://github.com/acme-labs/repository",
          client_id: p.client_id,
          client_name: p.client_name || p.client_email?.split("@")[0] || "Client",
          client_email: p.client_email || "",
          freelancer_id: p.freelancer_id,
          freelancer_name:
            p.freelancer_name ||
            (p.freelancer_id
              ? p.invited_freelancer_email.split("@")[0]
              : "Pending Invite Claim"),
          invited_freelancer_email: p.invited_freelancer_email,
          freelancer_paypal_email: p.freelancer_paypal_email || "",
          invite_token: p.invite_token || "",
          invite_status:
            p.invite_status ||
            (p.freelancer_id ? "accepted" : "pending_invite"),
          invite_accepted_at: p.invite_accepted_at,
          total_budget: Number(p.total_budget || 0),
          status: p.status || "active",
          created_at: p.created_at,
        }));

        setProjects(loadedProjects);

        if (loadedProjects.length === 0) {
          setMilestones([]);
          setTransactions([]);
          setLogsByMilestone({});
          return;
        }

        const projectIds = loadedProjects.map((p) => p.id);

        // 2. Fetch milestones for visible projects
        const { data: msData } = await sb
          .from("milestones")
          .select("*")
          .in("project_id", projectIds)
          .order("created_at", { ascending: true });

        const loadedMilestones: Milestone[] = (msData || []).map((m) => ({
          id: m.id,
          project_id: m.project_id,
          title: m.title,
          description: m.description,
          amount: Number(m.amount || 0),
          status: m.status,
          release_mode: m.release_mode || "autonomous",
          acceptance_criteria: Array.isArray(m.acceptance_criteria)
            ? m.acceptance_criteria
            : [],
          github_commit_url: m.github_commit_url || undefined,
          preview_url: m.preview_url || undefined,
          ai_confidence_score:
            typeof m.ai_confidence_score === "number"
              ? m.ai_confidence_score
              : undefined,
          ai_review_notes: m.ai_review_notes || undefined,
          plain_english_summary: Array.isArray(m.plain_english_summary)
            ? m.plain_english_summary
            : undefined,
          created_at: m.created_at,
        }));

        setMilestones(loadedMilestones);

        const milestoneIds = loadedMilestones.map((m) => m.id);
        if (milestoneIds.length > 0) {
          // 3. Fetch transactions
          const { data: txData } = await sb
            .from("transactions")
            .select("*")
            .in("milestone_id", milestoneIds)
            .order("created_at", { ascending: false });

          setTransactions(
            (txData || []).map((t) => ({
              id: t.id,
              project_id: t.project_id,
              milestone_id: t.milestone_id,
              milestone_title: t.milestone_title,
              paypal_order_id: t.paypal_order_id,
              paypal_payout_batch_id: t.paypal_payout_batch_id,
              recipient_paypal_email: t.recipient_paypal_email,
              amount: Number(t.amount || 0),
              type: t.type,
              status: t.status,
              created_at: t.created_at,
            }))
          );

          // 4. Fetch agent_logs
          const { data: logData } = await sb
            .from("agent_logs")
            .select("*")
            .in("milestone_id", milestoneIds)
            .order("created_at", { ascending: true });

          const groupedLogs: Record<string, AgentLogEntry[]> = {};
          for (const row of logData || []) {
            const entry: AgentLogEntry = {
              id: row.id,
              milestone_id: row.milestone_id,
              step_type: row.step_type,
              log_level: row.log_level || "info",
              title: row.title,
              detail: row.message || row.detail || "",
              status: row.status || "info",
              timestamp: row.created_at,
              metadata: row.metadata || {},
            };
            if (!groupedLogs[row.milestone_id]) {
              groupedLogs[row.milestone_id] = [];
            }
            groupedLogs[row.milestone_id].push(entry);
          }
          setLogsByMilestone(groupedLogs);
        }
      } finally {
        setIsLoadingData(false);
      }
    },
    []
  );

  /**
   * Load or upsert user profile from public.profiles given a Supabase Auth session user
   */
  const resolveAuthenticatedProfile = useCallback(
    async (authUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }): Promise<AuthenticatedUser> => {
      const sb = getSupabaseBrowserClient()!;
      const email = (authUser.email || "").toLowerCase();
      const metaRole =
        authUser.user_metadata?.role === "freelancer"
          ? "freelancer"
          : "client";
      const metaName =
        (authUser.user_metadata?.full_name as string) ||
        email.split("@")[0] ||
        "User";
      const metaPayPal =
        (authUser.user_metadata?.paypal_email as string) || undefined;

      const { data: profile } = await sb
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profile) {
        return {
          id: profile.id,
          email: profile.email,
          name: profile.full_name || metaName,
          role: profile.role === "freelancer" ? "freelancer" : "client",
          title:
            profile.role === "freelancer"
              ? "Verified Freelance Creator"
              : "Contract Initiator",
          paypal_email: profile.paypal_email || metaPayPal,
        };
      }

      // Profile row doesn't exist yet -> upsert it now
      const { data: inserted } = await sb
        .from("profiles")
        .upsert({
          id: authUser.id,
          email,
          full_name: metaName,
          role: metaRole,
          paypal_email: metaPayPal || null,
        })
        .select("*")
        .maybeSingle();

      return {
        id: authUser.id,
        email,
        name: inserted?.full_name || metaName,
        role: (inserted?.role || metaRole) as "client" | "freelancer",
        title:
          (inserted?.role || metaRole) === "freelancer"
            ? "Verified Freelance Creator"
            : "Contract Initiator",
        paypal_email: inserted?.paypal_email || metaPayPal,
      };
    },
    []
  );

  // Initialize Supabase Auth listener & Realtime subscriptions
  useEffect(() => {
    const creds = getSupabaseCredentials();
    setIsSupabaseReady(creds.isConfigured);

    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setIsLoadingAuth(false);
      return;
    }

    let mounted = true;

    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const resolved = await resolveAuthenticatedProfile(session.user);
        if (mounted) {
          setCurrentUser(resolved);
          await fetchAllWorkspaceData(resolved);
        }
      }
      if (mounted) setIsLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const resolved = await resolveAuthenticatedProfile(session.user);
        setCurrentUser(resolved);
        await fetchAllWorkspaceData(resolved);
      } else {
        setCurrentUser(null);
        setProjects([]);
        setMilestones([]);
        setTransactions([]);
        setLogsByMilestone({});
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchAllWorkspaceData, resolveAuthenticatedProfile]);

  // Realtime subscription to projects, milestones, transactions, agent_logs
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !currentUser) return;

    const channel = sb
      .channel(`autoscribe-realtime-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          fetchAllWorkspaceData(currentUser);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "milestones" },
        () => {
          fetchAllWorkspaceData(currentUser);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchAllWorkspaceData(currentUser);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [currentUser, fetchAllWorkspaceData]);

  const connectSupabaseRuntime = useCallback(
    async (url: string, anonKey: string): Promise<boolean> => {
      saveRuntimeSupabaseCredentials(url, anonKey);
      const sb = getSupabaseBrowserClient();
      if (!sb) return false;
      setIsSupabaseReady(true);
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (session?.user) {
        const user = await resolveAuthenticatedProfile(session.user);
        setCurrentUser(user);
        await fetchAllWorkspaceData(user);
      }
      toast.success("Connected to live Supabase instance!");
      return true;
    },
    [fetchAllWorkspaceData, resolveAuthenticatedProfile]
  );

  const signUpWithSupabase = useCallback(
    async (params: {
      fullName: string;
      email: string;
      password: string;
      role: "client" | "freelancer";
      paypalEmail?: string;
    }): Promise<{ user: AuthenticatedUser | null; error?: string }> => {
      const sb = getSupabaseBrowserClient();
      if (!sb) {
        return {
          user: null,
          error:
            "Supabase is not connected yet. Add your URL and Anon Key first.",
        };
      }

      const cleanEmail = params.email.trim().toLowerCase();
      const { data, error } = await sb.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            role: params.role,
            paypal_email: params.paypalEmail?.trim() || null,
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return {
          user: null,
          error: "Sign-up succeeded. Please check your email to confirm.",
        };
      }

      // If email confirmation is enabled on the Supabase project and session is null,
      // inform the user clearly or sign in
      if (!data.session) {
        const signInAttempt = await sb.auth.signInWithPassword({
          email: cleanEmail,
          password: params.password,
        });
        if (signInAttempt.error) {
          return {
            user: null,
            error:
              "Account created! Please confirm your email link (or disable 'Confirm email' in Supabase Auth -> Providers -> Email for instant login).",
          };
        }
      }

      const resolved = await resolveAuthenticatedProfile(data.user);
      setCurrentUser(resolved);
      await fetchAllWorkspaceData(resolved);
      return { user: resolved };
    },
    [fetchAllWorkspaceData, resolveAuthenticatedProfile]
  );

  const signInWithSupabase = useCallback(
    async (params: {
      email: string;
      password: string;
    }): Promise<{ user: AuthenticatedUser | null; error?: string }> => {
      const sb = getSupabaseBrowserClient();
      if (!sb) {
        return {
          user: null,
          error:
            "Supabase is not connected yet. Add your URL and Anon Key first.",
        };
      }

      const { data, error } = await sb.auth.signInWithPassword({
        email: params.email.trim().toLowerCase(),
        password: params.password,
      });

      if (error || !data.user) {
        return {
          user: null,
          error: error?.message || "Invalid login credentials.",
        };
      }

      const resolved = await resolveAuthenticatedProfile(data.user);
      setCurrentUser(resolved);
      await fetchAllWorkspaceData(resolved);
      return { user: resolved };
    },
    [fetchAllWorkspaceData, resolveAuthenticatedProfile]
  );

  const updateUserProfile = useCallback(
    async (params: { fullName?: string; paypalEmail?: string }) => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !currentUser) return;

      const updates: Record<string, unknown> = {};
      if (params.fullName !== undefined) updates.full_name = params.fullName;
      if (params.paypalEmail !== undefined)
        updates.paypal_email = params.paypalEmail;

      const { error } = await sb
        .from("profiles")
        .update(updates)
        .eq("id", currentUser.id);

      if (error) {
        toast.error(`Failed to update profile: ${error.message}`);
        return;
      }

      const updated: AuthenticatedUser = {
        ...currentUser,
        name: params.fullName ?? currentUser.name,
        paypal_email: params.paypalEmail ?? currentUser.paypal_email,
      };
      setCurrentUser(updated);
      toast.success("Profile updated in Supabase.");
    },
    [currentUser]
  );

  const refreshLiveData = useCallback(async () => {
    await fetchAllWorkspaceData(currentUser);
  }, [currentUser, fetchAllWorkspaceData]);

  const logout = useCallback(async () => {
    const sb = getSupabaseBrowserClient();
    if (sb) {
      await sb.auth.signOut();
    }
    setCurrentUser(null);
    setProjects([]);
    setMilestones([]);
    setTransactions([]);
    setLogsByMilestone({});
  }, []);

  const createProject = useCallback(
    async (
      newProj: Omit<Project, "id" | "created_at">,
      initialMilestones: Omit<Milestone, "id" | "project_id" | "created_at">[]
    ): Promise<Project | null> => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !currentUser) return null;

      // Check if invited freelancer already has a profile in Supabase
      const { data: existingFreelancer } = await sb
        .from("profiles")
        .select("*")
        .ilike("email", newProj.invited_freelancer_email.trim())
        .eq("role", "freelancer")
        .maybeSingle();

      const { data: insertedProj, error: projErr } = await sb
        .from("projects")
        .insert({
          title: newProj.title,
          description: newProj.description,
          repo_url: newProj.repo_url,
          client_id: currentUser.id,
          client_name: currentUser.name,
          client_email: currentUser.email,
          freelancer_id: existingFreelancer?.id || null,
          freelancer_name:
            existingFreelancer?.full_name || "Pending Invite Acceptance",
          invited_freelancer_email: newProj.invited_freelancer_email
            .trim()
            .toLowerCase(),
          freelancer_paypal_email: existingFreelancer?.paypal_email || "",
          invite_token: newProj.invite_token,
          invite_status: existingFreelancer ? "accepted" : "pending_invite",
          status: existingFreelancer ? "active" : "pending_invite",
          total_budget: newProj.total_budget,
        })
        .select("*")
        .single();

      if (projErr || !insertedProj) {
        toast.error(`Failed to create contract: ${projErr?.message}`);
        return null;
      }

      if (initialMilestones.length > 0) {
        const msRows = initialMilestones.map((m) => ({
          project_id: insertedProj.id,
          title: m.title,
          description: m.description,
          amount: m.amount,
          status: "pending",
          release_mode: m.release_mode,
          acceptance_criteria: m.acceptance_criteria,
        }));

        const { error: msErr } = await sb.from("milestones").insert(msRows);
        if (msErr) {
          console.error("Failed inserting initial milestones:", msErr.message);
        }
      }

      await fetchAllWorkspaceData(currentUser);
      return insertedProj as Project;
    },
    [currentUser, fetchAllWorkspaceData]
  );

  const createMilestone = useCallback(
    async (
      newMs: Omit<Milestone, "id" | "created_at">
    ): Promise<Milestone | null> => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !currentUser) return null;

      const { data: inserted, error } = await sb
        .from("milestones")
        .insert({
          project_id: newMs.project_id,
          title: newMs.title,
          description: newMs.description,
          amount: newMs.amount,
          status: "pending",
          release_mode: newMs.release_mode,
          acceptance_criteria: newMs.acceptance_criteria,
        })
        .select("*")
        .single();

      if (error || !inserted) {
        toast.error(`Failed to add milestone: ${error?.message}`);
        return null;
      }

      // Update parent project total_budget
      const parent = projects.find((p) => p.id === newMs.project_id);
      if (parent) {
        await sb
          .from("projects")
          .update({ total_budget: parent.total_budget + newMs.amount })
          .eq("id", parent.id);
      }

      await fetchAllWorkspaceData(currentUser);
      return inserted as Milestone;
    },
    [currentUser, fetchAllWorkspaceData, projects]
  );

  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !currentUser) return false;

      const targetProj = projects.find((p) => p.id === projectId);

      // Delete child milestones first, then parent project
      await sb.from("milestones").delete().eq("project_id", projectId);

      const { data: deletedRows, error } = await sb
        .from("projects")
        .delete()
        .eq("id", projectId)
        .select("id");

      if (error) {
        toast.error(`Failed to delete contract: ${error.message}`);
        return false;
      }

      if (!deletedRows || deletedRows.length === 0) {
        toast.error(
          "Supabase RLS blocked project deletion. Run the DELETE policy in supabase/schema.sql inside your Supabase SQL Editor."
        );
        return false;
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setMilestones((prev) => prev.filter((m) => m.project_id !== projectId));
      toast.success(
        `Deleted contract "${targetProj?.title || projectId}" from Supabase.`
      );
      await fetchAllWorkspaceData(currentUser);
      return true;
    },
    [currentUser, fetchAllWorkspaceData, projects]
  );

  const deleteMilestone = useCallback(
    async (milestoneId: string): Promise<boolean> => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !currentUser) return false;

      const targetMs = milestones.find((m) => m.id === milestoneId);
      const { data: deletedRows, error } = await sb
        .from("milestones")
        .delete()
        .eq("id", milestoneId)
        .select("id");

      if (error) {
        toast.error(`Failed to delete milestone: ${error.message}`);
        return false;
      }

      if (!deletedRows || deletedRows.length === 0) {
        toast.error(
          "Supabase RLS blocked milestone deletion. Run the DELETE policy in supabase/schema.sql inside your Supabase SQL Editor."
        );
        return false;
      }

      if (targetMs) {
        const parent = projects.find((p) => p.id === targetMs.project_id);
        if (parent) {
          const nextBudget = Math.max(0, parent.total_budget - targetMs.amount);
          await sb
            .from("projects")
            .update({ total_budget: nextBudget })
            .eq("id", parent.id);
        }
      }

      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
      toast.success(`Removed milestone "${targetMs?.title || milestoneId}".`);
      await fetchAllWorkspaceData(currentUser);
      return true;
    },
    [currentUser, fetchAllWorkspaceData, milestones, projects]
  );

  const acceptProjectInvite = useCallback(
    async (projectId: string, paypalEmail: string) => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !currentUser) return;

      const cleanPayPal = paypalEmail.trim();

      // Update freelancer profile PayPal email as well
      await sb
        .from("profiles")
        .update({ paypal_email: cleanPayPal })
        .eq("id", currentUser.id);

      const { error } = await sb
        .from("projects")
        .update({
          freelancer_id: currentUser.id,
          freelancer_name: currentUser.name,
          freelancer_paypal_email: cleanPayPal,
          invite_status: "accepted",
          status: "active",
          invite_accepted_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) {
        toast.error(`Failed to claim invite: ${error.message}`);
        return;
      }

      setCurrentUser({ ...currentUser, paypal_email: cleanPayPal });
      await fetchAllWorkspaceData(currentUser);
      toast.success(
        `Invitation claimed! Bound ${currentUser.name} (${cleanPayPal}) to contract.`
      );
    },
    [currentUser, fetchAllWorkspaceData]
  );

  const toggleReleaseMode = useCallback(
    async (milestoneId: string, mode: ReleaseMode) => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return;

      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, release_mode: mode } : m
        )
      );

      await sb
        .from("milestones")
        .update({ release_mode: mode })
        .eq("id", milestoneId);

      toast.info(
        mode === "autonomous"
          ? "Autonomous Mode Active: Instant PayPal Payout when AI confidence ≥ 90%."
          : "Co-Pilot Mode Active: AI verifies deliverable first, then queues 1-click client payout."
      );
    },
    []
  );

  const fundMilestone = useCallback(
    async (milestone: Milestone, projectId: string) => {
      const sb = getSupabaseBrowserClient();
      const result = await fundMilestoneAction({
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amount: milestone.amount,
      });

      if (sb) {
        await sb
          .from("milestones")
          .update({ status: "funded" })
          .eq("id", milestone.id);

        await sb.from("transactions").insert({
          project_id: projectId,
          milestone_id: milestone.id,
          milestone_title: milestone.title,
          paypal_order_id: result.orderId,
          amount: milestone.amount,
          type: "deposit",
          status: "COMPLETED",
          raw_response: result.rawPayPalOrder,
        });
      }

      await fetchAllWorkspaceData(currentUser);
      toast.success(
        `PayPal Order [${result.orderId}] Captured — $${milestone.amount.toFixed(
          2
        )} locked in escrow vault.`
      );
    },
    [currentUser, fetchAllWorkspaceData]
  );

  const runAgentVerification = useCallback(
    async (params: {
      milestone: Milestone;
      project: Project;
      commitUrl: string;
      previewUrl: string;
      onStepProgress?: (stepIndex: number, allLogs: AgentLogEntry[]) => void;
    }) => {
      const { milestone, project, commitUrl, previewUrl, onStepProgress } =
        params;
      const sb = getSupabaseBrowserClient();

      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestone.id
            ? {
                ...m,
                status: "verifying",
                github_commit_url: commitUrl,
                preview_url: previewUrl,
              }
            : m
        )
      );

      toast.info("AI Verification Engine invoked — parsing GitHub diff AST...");

      const recipientPayPal =
        project.freelancer_paypal_email ||
        currentUser?.paypal_email ||
        "freelancer-sb@personal.example.com";

      const { verification, payoutTransaction } =
        await verifyAndPayoutMilestoneAction({
          milestone,
          commitUrl,
          previewUrl,
          freelancerPayPalEmail: recipientPayPal,
          projectRepoUrl: project.repo_url,
        });

      for (let i = 1; i <= verification.logs.length; i++) {
        await new Promise((r) => setTimeout(r, 440));
        onStepProgress?.(i, verification.logs);
      }

      const nextStatus: MilestoneStatus = verification.securityBlocked
        ? "disputed"
        : verification.passed
        ? verification.payoutResult
          ? "paid"
          : "verified"
        : "revision_requested";

      if (sb) {
        await sb
          .from("milestones")
          .update({
            status: nextStatus,
            github_commit_url: commitUrl,
            preview_url: previewUrl,
            ai_confidence_score: verification.confidenceScore,
            ai_review_notes: verification.summaryNotes,
            plain_english_summary: verification.plainEnglishSummary,
            acceptance_criteria: verification.updatedCriteria,
          })
          .eq("id", milestone.id);

        if (verification.logs.length > 0) {
          await sb.from("agent_logs").insert(
            verification.logs.map((l) => ({
              milestone_id: milestone.id,
              step_type: l.step_type,
              log_level: l.log_level,
              title: l.title,
              message: l.detail,
              status: l.status,
              metadata: l.metadata || {},
            }))
          );
        }

        if (payoutTransaction) {
          await sb.from("transactions").insert({
            project_id: project.id,
            milestone_id: milestone.id,
            milestone_title: milestone.title,
            paypal_payout_batch_id: payoutTransaction.paypal_payout_batch_id,
            recipient_paypal_email: payoutTransaction.recipient_paypal_email,
            amount: milestone.amount,
            type: "payout",
            status: "COMPLETED",
          });
        }
      }

      await fetchAllWorkspaceData(currentUser);

      if (payoutTransaction) {
        toast.success(
          `Verified (${verification.confidenceScore}%) — PayPal Payout [${
            payoutTransaction.paypal_payout_batch_id
          }] dispatched $${milestone.amount.toFixed(2)} to ${recipientPayPal}`
        );
      } else if (verification.passed) {
        toast.success(
          `Verified (${verification.confidenceScore}%) — Queued for Client 1-Click Co-Pilot release.`
        );
      } else if (verification.securityBlocked) {
        toast.error(
          "SECURITY ALERT: Adversarial prompt injection blocked in diff! Escrow vault locked."
        );
      } else {
        toast.warning(
          `Revision Requested (${verification.confidenceScore}% confidence) — Missing requirements flagged.`
        );
      }
    },
    [currentUser, fetchAllWorkspaceData]
  );

  const releaseCopilotPayout = useCallback(
    async (milestone: Milestone, project: Project) => {
      const sb = getSupabaseBrowserClient();
      const recipientPayPal =
        project.freelancer_paypal_email || "freelancer-sb@personal.example.com";

      const res = await releaseCopilotPayoutAction({
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amount: milestone.amount,
        freelancerPayPalEmail: recipientPayPal,
      });

      if (sb) {
        await sb
          .from("milestones")
          .update({ status: "paid" })
          .eq("id", milestone.id);

        await sb.from("transactions").insert({
          project_id: project.id,
          milestone_id: milestone.id,
          milestone_title: milestone.title,
          paypal_payout_batch_id: res.payoutBatchId,
          recipient_paypal_email: recipientPayPal,
          amount: milestone.amount,
          type: "payout",
          status: "COMPLETED",
          raw_response: res.rawPayload,
        });
      }

      await fetchAllWorkspaceData(currentUser);
      toast.success(
        `PayPal Payout Batch [${
          res.payoutBatchId
        }] Disbursed $${milestone.amount.toFixed(2)} to ${recipientPayPal}!`
      );
    },
    [currentUser, fetchAllWorkspaceData]
  );

  const resetDisputedMilestone = useCallback(
    async (milestoneId: string) => {
      const sb = getSupabaseBrowserClient();
      await resetDisputedMilestoneAction({ milestoneId });
      if (sb) {
        await sb
          .from("milestones")
          .update({
            status: "funded",
            ai_confidence_score: null,
            ai_review_notes: "Dispute resolved by client. Reset to funded state for clean resubmission.",
            plain_english_summary: null,
            github_commit_url: null,
            preview_url: null,
          })
          .eq("id", milestoneId);
      }
      await fetchAllWorkspaceData(currentUser);
      toast.success("Dispute resolved. Milestone unlocked and reset to funded state for resubmission.");
    },
    [currentUser, fetchAllWorkspaceData]
  );

  const refundDisputedMilestone = useCallback(
    async (milestone: Milestone, projectId: string) => {
      const sb = getSupabaseBrowserClient();
      const res = await refundDisputedMilestoneAction({
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amount: milestone.amount,
        projectId,
      });

      if (sb) {
        await sb
          .from("milestones")
          .update({
            status: "pending",
            ai_confidence_score: null,
            ai_review_notes: `Escrow refunded to client ($${milestone.amount.toFixed(2)} USD). Milestone reset to pending.`,
            plain_english_summary: [
              `Escrow deposit of $${milestone.amount.toFixed(2)} was refunded to the client after dispute review.`,
              "Milestone status returned to pending.",
            ],
            github_commit_url: null,
            preview_url: null,
          })
          .eq("id", milestone.id);

        await sb.from("transactions").insert({
          project_id: projectId,
          milestone_id: milestone.id,
          milestone_title: milestone.title,
          amount: milestone.amount,
          type: "refund",
          status: "COMPLETED",
          raw_response: {
            action: "escrow_refund",
            refundedAt: new Date().toISOString(),
            amount: milestone.amount,
          },
        });
      }

      await fetchAllWorkspaceData(currentUser);
      toast.success(`Escrow refunded! $${milestone.amount.toFixed(2)} USD credited back to client.`);
    },
    [currentUser, fetchAllWorkspaceData]
  );

  return (
    <AutoScribeContext.Provider
      value={{
        isSupabaseReady,
        isLoadingAuth,
        isLoadingData,
        currentUser,
        projects,
        visibleProjects: projects,
        milestones,
        transactions,
        logsByMilestone,
        connectSupabaseRuntime,
        signUpWithSupabase,
        signInWithSupabase,
        updateUserProfile,
        refreshLiveData,
        logout,
        createProject,
        createMilestone,
        deleteProject,
        deleteMilestone,
        acceptProjectInvite,
        toggleReleaseMode,
        fundMilestone,
        runAgentVerification,
        releaseCopilotPayout,
        resetDisputedMilestone,
        refundDisputedMilestone,
      }}
    >
      {children}
    </AutoScribeContext.Provider>
  );
}

export function useAutoScribe() {
  const ctx = useContext(AutoScribeContext);
  if (!ctx) {
    throw new Error("useAutoScribe must be used within AutoScribeProvider");
  }
  return ctx;
}

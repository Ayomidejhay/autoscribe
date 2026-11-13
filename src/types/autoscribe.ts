export type UserRole = "client" | "freelancer";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  paypal_email?: string;
}

export type MilestoneStatus =
  | "pending"
  | "funded"
  | "submitted"
  | "verifying"
  | "verified"
  | "revision_requested"
  | "paid"
  | "disputed";

export type ReleaseMode = "autonomous" | "copilot";

export type InviteStatus = "pending_invite" | "accepted";

export type DeliverableType =
  | "code"
  | "design"
  | "content"
  | "data"
  | "general";

export type LogLevel = "info" | "warning" | "security_alert" | "success";

export interface AcceptanceCriterion {
  id: string;
  label: string;
  requiredFilePattern?: string;
  passed?: boolean | null;
  reasoning?: string;
}

export interface AgentLogEntry {
  id: string;
  milestone_id: string;
  step_type:
    | "TOOL_CALL"
    | "DIFF_ANALYSIS"
    | "SECURITY_SCAN"
    | "CRITERION_CHECK"
    | "DECISION"
    | "PAYPAL_PAYOUT";
  log_level: LogLevel;
  title: string;
  detail: string;
  status: "running" | "passed" | "failed" | "info";
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface EscrowTransaction {
  id: string;
  project_id?: string;
  milestone_id: string;
  milestone_title?: string;
  paypal_order_id?: string;
  paypal_payout_batch_id?: string;
  recipient_paypal_email?: string;
  amount: number;
  type: "deposit" | "payout" | "refund";
  status: "COMPLETED" | "PENDING" | "FAILED";
  created_at: string;
  mode?: "live_sandbox" | "simulated_sandbox";
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  release_mode: ReleaseMode;
  acceptance_criteria: AcceptanceCriterion[];
  deliverable_type?: DeliverableType;
  github_commit_url?: string;
  preview_url?: string;
  ai_confidence_score?: number;
  ai_review_notes?: string;
  plain_english_summary?: string[];
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  repo_url: string;
  deliverable_type?: DeliverableType;
  client_id: string;
  client_name: string;
  client_email: string;
  freelancer_id: string | null;
  freelancer_name: string;
  invited_freelancer_email: string;
  freelancer_paypal_email: string;
  invite_token: string;
  invite_status: InviteStatus;
  invite_accepted_at?: string;
  total_budget: number;
  status: "pending_invite" | "active" | "completed" | "disputed";
  created_at: string;
}

export interface DemoPresetSubmission {
  id: string;
  label: string;
  badge: string;
  description: string;
  commitUrl: string;
  previewUrl: string;
  simulatedDiff: {
    sha: string;
    author: string;
    message: string;
    filesChanged: {
      filename: string;
      additions: number;
      deletions: number;
      patch: string;
    }[];
  };
}

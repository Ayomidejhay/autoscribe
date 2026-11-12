"use server";

import {
  AcceptanceCriterion,
  EscrowTransaction,
  Milestone,
} from "@/types/autoscribe";
import {
  createAndCapturePayPalOrder,
  executePayPalMilestonePayout,
} from "@/lib/paypal";
import {
  AgentVerificationOutput,
  runAutonomousMilestoneVerification,
} from "@/lib/agent";
import {
  geminiDecomposeProjectScope,
  geminiSynthesizeMilestoneCriteria,
} from "@/lib/gemini";
import { getServerSupabaseClient } from "@/lib/supabase";

export async function fundMilestoneAction(params: {
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
}): Promise<{
  orderId: string;
  transaction: EscrowTransaction;
  rawPayPalOrder: Record<string, unknown>;
}> {
  const result = await createAndCapturePayPalOrder({
    milestoneId: params.milestoneId,
    milestoneTitle: params.milestoneTitle,
    amount: params.amount,
  });

  const transaction: EscrowTransaction = {
    id: `tx_${Date.now()}`,
    milestone_id: params.milestoneId,
    milestone_title: params.milestoneTitle,
    paypal_order_id: result.orderId,
    amount: params.amount,
    type: "deposit",
    status: "COMPLETED",
    created_at: new Date().toISOString(),
    mode: result.mode,
  };

  const supabase = getServerSupabaseClient();
  if (supabase) {
    await supabase
      .from("milestones")
      .update({ status: "funded" })
      .eq("id", params.milestoneId);

    await supabase.from("transactions").insert({
      milestone_id: params.milestoneId,
      paypal_order_id: result.orderId,
      amount: params.amount,
      type: "deposit",
      status: "COMPLETED",
      raw_response: result.rawPayload,
    });
  }

  return {
    orderId: result.orderId,
    transaction,
    rawPayPalOrder: result.rawPayload,
  };
}

export async function verifyAndPayoutMilestoneAction(params: {
  milestone: Milestone;
  commitUrl: string;
  previewUrl?: string;
  freelancerPayPalEmail: string;
}): Promise<{
  verification: AgentVerificationOutput;
  payoutTransaction?: EscrowTransaction;
}> {
  const verification = await runAutonomousMilestoneVerification(params);

  let payoutTransaction: EscrowTransaction | undefined;

  if (verification.payoutResult) {
    payoutTransaction = {
      id: `tx_payout_${Date.now()}`,
      milestone_id: params.milestone.id,
      milestone_title: params.milestone.title,
      paypal_payout_batch_id: verification.payoutResult.payoutBatchId,
      recipient_paypal_email: verification.payoutResult.recipientEmail,
      amount: params.milestone.amount,
      type: "payout",
      status: "COMPLETED",
      created_at: new Date().toISOString(),
      mode: verification.payoutResult.mode,
    };
  }

  const supabase = getServerSupabaseClient();
  if (supabase) {
    const newStatus = verification.securityBlocked
      ? "disputed"
      : verification.passed
      ? verification.payoutResult
        ? "paid"
        : "verified"
      : "revision_requested";

    await supabase
      .from("milestones")
      .update({
        status: newStatus,
        github_commit_url: params.commitUrl,
        preview_url: params.previewUrl,
        ai_confidence_score: verification.confidenceScore,
        ai_review_notes: verification.summaryNotes,
        plain_english_summary: verification.plainEnglishSummary,
        acceptance_criteria: verification.updatedCriteria,
      })
      .eq("id", params.milestone.id);

    if (verification.logs.length > 0) {
      await supabase.from("agent_logs").insert(
        verification.logs.map((l) => ({
          milestone_id: l.milestone_id,
          step_type: l.step_type,
          log_level: l.log_level,
          title: l.title,
          message: l.detail,
          metadata: l.metadata || {},
        }))
      );
    }

    if (verification.payoutResult) {
      await supabase.from("transactions").insert({
        milestone_id: params.milestone.id,
        paypal_payout_batch_id: verification.payoutResult.payoutBatchId,
        recipient_paypal_email: verification.payoutResult.recipientEmail,
        amount: params.milestone.amount,
        type: "payout",
        status: "COMPLETED",
        raw_response: verification.payoutResult.rawPayload,
      });
    }
  }

  return {
    verification,
    payoutTransaction,
  };
}

export async function releaseCopilotPayoutAction(params: {
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
  freelancerPayPalEmail: string;
}): Promise<{
  payoutBatchId: string;
  transaction: EscrowTransaction;
  rawPayload: Record<string, unknown>;
}> {
  const payout = await executePayPalMilestonePayout({
    milestoneId: params.milestoneId,
    milestoneTitle: params.milestoneTitle,
    recipientEmail: params.freelancerPayPalEmail,
    amount: params.amount,
  });

  const transaction: EscrowTransaction = {
    id: `tx_copilot_${Date.now()}`,
    milestone_id: params.milestoneId,
    milestone_title: params.milestoneTitle,
    paypal_payout_batch_id: payout.payoutBatchId,
    recipient_paypal_email: payout.recipientEmail,
    amount: params.amount,
    type: "payout",
    status: "COMPLETED",
    created_at: new Date().toISOString(),
    mode: payout.mode,
  };

  const supabase = getServerSupabaseClient();
  if (supabase) {
    await supabase
      .from("milestones")
      .update({ status: "paid" })
      .eq("id", params.milestoneId);

    await supabase.from("transactions").insert({
      milestone_id: params.milestoneId,
      paypal_payout_batch_id: payout.payoutBatchId,
      recipient_paypal_email: payout.recipientEmail,
      amount: params.amount,
      type: "payout",
      status: "COMPLETED",
      raw_response: payout.rawPayload,
    });
  }

  return {
    payoutBatchId: payout.payoutBatchId,
    transaction,
    rawPayload: payout.rawPayload,
  };
}

export async function resetDisputedMilestoneAction(params: {
  milestoneId: string;
}): Promise<{ success: boolean }> {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    await supabase
      .from("milestones")
      .update({
        status: "funded",
        ai_confidence_score: null,
        ai_review_notes: "Dispute resolved by client. Reset to funded state for clean resubmission.",
        plain_english_summary: null,
        github_commit_url: null,
        preview_url: null,
      })
      .eq("id", params.milestoneId);

    await supabase.from("agent_logs").insert({
      milestone_id: params.milestoneId,
      step_type: "DECISION",
      log_level: "info",
      title: "Client Action: Milestone Reset & Unlocked",
      detail: "The client resolved the security lock or dispute. Milestone escrow remains funded and ready for freelancer resubmission.",
      status: "info",
      metadata: { action: "dispute_reset", timestamp: new Date().toISOString() },
    });
  }

  return { success: true };
}

export async function refundDisputedMilestoneAction(params: {
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
  projectId: string;
}): Promise<{ transaction: EscrowTransaction }> {
  const transaction: EscrowTransaction = {
    id: `tx_refund_${Date.now()}`,
    project_id: params.projectId,
    milestone_id: params.milestoneId,
    milestone_title: params.milestoneTitle,
    amount: params.amount,
    type: "refund",
    status: "COMPLETED",
    created_at: new Date().toISOString(),
    mode: "live_sandbox",
  };

  const supabase = getServerSupabaseClient();
  if (supabase) {
    await supabase
      .from("milestones")
      .update({
        status: "pending",
        ai_confidence_score: null,
        ai_review_notes: `Escrow refunded to client ($${params.amount.toFixed(2)} USD). Milestone reset to pending.`,
        plain_english_summary: [
          `Escrow deposit of $${params.amount.toFixed(2)} was refunded to the client after dispute review.`,
          "Milestone status returned to pending.",
        ],
        github_commit_url: null,
        preview_url: null,
      })
      .eq("id", params.milestoneId);

    await supabase.from("transactions").insert({
      project_id: params.projectId,
      milestone_id: params.milestoneId,
      milestone_title: params.milestoneTitle,
      amount: params.amount,
      type: "refund",
      status: "COMPLETED",
      raw_response: {
        action: "escrow_refund",
        refundedAt: new Date().toISOString(),
        amount: params.amount,
      },
    });

    await supabase.from("agent_logs").insert({
      milestone_id: params.milestoneId,
      step_type: "DECISION",
      log_level: "info",
      title: "Client Action: Escrow Refunded",
      detail: `Client authorized escrow deposit refund of $${params.amount.toFixed(2)} USD. Transaction recorded in ledger and milestone returned to pending.`,
      status: "info",
      metadata: { action: "escrow_refund", amount: params.amount, timestamp: new Date().toISOString() },
    });
  }

  return { transaction };
}

export async function generateSmartCriteriaAction(params: {
  title: string;
  description: string;
}): Promise<AcceptanceCriterion[]> {
  return await geminiSynthesizeMilestoneCriteria(params);
}

export async function generateProjectScopeBreakdownAction(params: {
  title: string;
  description: string;
  totalBudget: number;
}): Promise<
  {
    title: string;
    description: string;
    amount: number;
    release_mode: "autonomous" | "copilot";
    acceptance_criteria: AcceptanceCriterion[];
  }[]
> {
  return await geminiDecomposeProjectScope(params);
}

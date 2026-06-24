"use server";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  PaymentSubmissionWithUser,
  Subscription,
} from "@/types/database.types";

// All submission reads/writes run as service_role: the admin needs to see EVERY
// user's submissions (RLS would restrict an authenticated session to its own),
// generate signed URLs for the private screenshots, and call the SECURITY
// DEFINER approve/reject RPCs that are denied to `authenticated`.

export async function getPaymentSubmissions(options?: {
  status?: "pending" | "approved" | "rejected";
}): Promise<{ data: PaymentSubmissionWithUser[]; count: number }> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("payment_submissions")
    .select(
      "*, users(id, name, email, account_id, premium_until)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return {
    data: (data ?? []) as PaymentSubmissionWithUser[],
    count: count ?? 0,
  };
}

// Short-lived signed URL for a private receipt screenshot (admin viewing only).
export async function getPaymentProofUrl(
  proofPath: string
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(proofPath, 60 * 10); // 10 minutes
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}

// Push a notification to the buyer's FCM topic (their auth uid) via the
// `notify-user` edge function. Best-effort: a push failure must never roll back
// or surface over the approval/rejection itself.
async function notifyBuyer(
  supabase: ReturnType<typeof createServiceRoleClient>,
  submissionId: number,
  payload: { title: string; body: string; status: "approved" | "rejected" }
): Promise<void> {
  try {
    const { data } = await supabase
      .from("payment_submissions")
      .select("users(user_id)")
      .eq("id", submissionId)
      .single();
    const topic = (data?.users as { user_id?: string } | null)?.user_id;
    if (!topic) return;
    await supabase.functions.invoke("notify-user", {
      body: {
        topic,
        title: payload.title,
        body: payload.body,
        data: { type: "payment_review", status: payload.status },
      },
    });
  } catch (err) {
    console.error("notifyBuyer failed:", err);
  }
}

// Approve -> reuses grant_subscription (extend/stack + ledger) via the RPC,
// links the screenshot, and flips the submission to 'approved'.
export async function approvePaymentSubmission(
  submissionId: number
): Promise<Subscription> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("approve_payment_submission", {
    submission_id: submissionId,
  });
  if (error) throw new Error(error.message);
  await notifyBuyer(supabase, submissionId, {
    title: "Premium activated 🎉",
    body: "Your premium is now active. Enjoy your learning!",
    status: "approved",
  });
  return data as Subscription;
}

export async function rejectPaymentSubmission(input: {
  submissionId: number;
  reason: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("reject_payment_submission", {
    submission_id: input.submissionId,
    reason: input.reason,
  });
  if (error) throw new Error(error.message);
  await notifyBuyer(supabase, input.submissionId, {
    title: "Payment not approved",
    body: input.reason.trim() ||
      "Your payment was not approved. Please submit again.",
    status: "rejected",
  });
}

// Reverse an already-approved payment: kills premium now, refunds the ledger
// row, flips the submission to rejected (with reason). See the SQL migration.
export async function revokePaymentSubmission(input: {
  submissionId: number;
  reason: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("revoke_payment_submission", {
    submission_id: input.submissionId,
    reason: input.reason,
  });
  if (error) throw new Error(error.message);
  await notifyBuyer(supabase, input.submissionId, {
    title: "Premium revoked",
    body: input.reason.trim() ||
      "Your premium access has been revoked.",
    status: "rejected",
  });
}

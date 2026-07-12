"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { SubscriptionPlan, Subscription } from "@/types/database.types";

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    // Group by tier (standard, pro) then duration so the picker reads cleanly.
    .order("tier", { ascending: true })
    .order("duration_days", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubscriptionPlan[];
}

// Edit a tier's price (price_cents holds the whole MMK amount). Service-role:
// subscription_plans is not client-writable.
export async function updatePlanPrice(input: {
  code: string;
  priceCents: number;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("subscription_plans")
    .update({ price_cents: input.priceCents })
    .eq("code", input.code);
  if (error) throw new Error(error.message);
}

// Calls the SECURITY DEFINER RPC. Must use the pure service-role client: the
// regular server client carries the admin's auth cookie and runs as
// `authenticated`, which is (intentionally) denied EXECUTE on this function.
export async function grantSubscription(input: {
  userId: number;
  planCode: string;
  paymentRef?: string;
  note?: string;
}): Promise<Subscription> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("grant_subscription", {
    target_user_id: input.userId,
    plan_code: input.planCode,
    payment_ref_param: input.paymentRef || null,
    note_param: input.note || null,
  });
  if (error) throw new Error(error.message);
  return data as Subscription;
}

// End a user's premium immediately, regardless of how it was granted. Sets
// premium_until = now() and expires any active subscription ledger rows.
export async function endPremium(userId: number): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("end_premium", {
    target_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

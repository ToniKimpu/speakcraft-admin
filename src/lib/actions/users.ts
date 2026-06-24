"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { User, SubscriptionWithPlan } from "@/types/database.types";

export async function getUsers(options?: {
  search?: string;
}): Promise<{ data: User[]; count: number }> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options?.search) {
    const term = `%${options.search}%`;
    query = query.or(`name.ilike.${term},email.ilike.${term}`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as User[], count: count ?? 0 };
}

export async function getUserSubscriptions(
  userId: number
): Promise<SubscriptionWithPlan[]> {
  // Service-role client: the subscriptions RLS only exposes a user's OWN rows,
  // so the admin (authenticated) would otherwise read nothing for other users.
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, subscription_plans(code, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubscriptionWithPlan[];
}

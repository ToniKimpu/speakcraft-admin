"use server";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  PaymentMethod,
  PaymentMethodInsert,
  PaymentMethodUpdate,
} from "@/types/database.types";

// Payment methods are admin-managed "money config" — RLS lets the mobile app
// read only ACTIVE rows and never write. The admin therefore manages them with
// the pure service-role client (bypasses RLS) so it can see inactive rows and
// create/update/delete, mirroring how grant_subscription is called.

export async function getPaymentMethods(): Promise<{
  data: PaymentMethod[];
  count: number;
}> {
  const supabase = createServiceRoleClient();
  const { data, error, count } = await supabase
    .from("payment_methods")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as PaymentMethod[], count: count ?? 0 };
}

export async function createPaymentMethod(
  values: PaymentMethodInsert
): Promise<PaymentMethod> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .insert(values)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PaymentMethod;
}

export async function updatePaymentMethod(
  id: number,
  values: PaymentMethodUpdate
): Promise<PaymentMethod> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PaymentMethod;
}

// Hard delete. Submissions reference the method via ON DELETE SET NULL and keep
// their snapshotted method_label, so history is preserved.
export async function deletePaymentMethod(id: number): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

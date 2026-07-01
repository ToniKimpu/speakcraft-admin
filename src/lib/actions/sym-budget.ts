"use server";

// Service-role (no auth cookie) so admin reads/writes bypass RLS on
// sym_budget_config — authenticated can only SELECT, and there is NO
// insert/update policy, so the service-role key is required to write.
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  SymBudgetConfig,
  SymBudgetConfigUpdate,
} from "@/types/database.types";

// The table is a single-row config keyed at id = 1.
const SYM_BUDGET_ID = 1;

export async function getSymBudgetConfig(): Promise<SymBudgetConfig> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sym_budget_config")
    .select("*")
    .eq("id", SYM_BUDGET_ID)
    .single();
  if (error) throw new Error(error.message);
  return data as SymBudgetConfig;
}

export async function updateSymBudgetConfig(
  values: SymBudgetConfigUpdate
): Promise<SymBudgetConfig> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sym_budget_config")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", SYM_BUDGET_ID)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SymBudgetConfig;
}

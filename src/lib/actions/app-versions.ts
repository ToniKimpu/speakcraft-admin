"use server";

// Service-role (no auth cookie) so admin reads/writes bypass the read-only RLS
// on app_versions — authenticated can only SELECT non-deleted rows.
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  AppVersion,
  AppVersionInsert,
  AppVersionUpdate,
} from "@/types/database.types";

export async function getAppVersions(options?: {
  showDeleted?: boolean;
}): Promise<{ data: AppVersion[]; count: number }> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("app_versions")
    .select("*", { count: "exact" })
    .order("build_number", { ascending: false });

  if (!options?.showDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as AppVersion[], count: count ?? 0 };
}

export async function getAppVersion(id: number): Promise<AppVersion> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("app_versions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as AppVersion;
}

export async function createAppVersion(
  values: AppVersionInsert
): Promise<AppVersion> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("app_versions")
    .insert(values)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as AppVersion;
}

export async function updateAppVersion(
  id: number,
  values: AppVersionUpdate
): Promise<AppVersion> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("app_versions")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as AppVersion;
}

export async function softDeleteAppVersion(id: number): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("app_versions")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreAppVersion(id: number): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("app_versions")
    .update({ is_deleted: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

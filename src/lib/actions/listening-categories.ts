"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ListeningCategory } from "@/types/database.types";

export async function getListeningCategories(options?: {
  showDeleted?: boolean;
}): Promise<{ data: ListeningCategory[]; count: number }> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("listening_categories")
    .select("*", { count: "exact" })
    .order("name", { ascending: true });

  if (!options?.showDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as ListeningCategory[], count: count ?? 0 };
}

export async function createListeningCategory(
  name: string
): Promise<ListeningCategory> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("listening_categories")
    .insert({ name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ListeningCategory;
}

export async function updateListeningCategory(
  id: number,
  name: string
): Promise<ListeningCategory> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("listening_categories")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ListeningCategory;
}

export async function softDeleteListeningCategory(
  id: number
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("listening_categories")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreListeningCategory(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("listening_categories")
    .update({ is_deleted: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

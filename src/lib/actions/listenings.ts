"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Listening,
  ListeningInsert,
  ListeningUpdate,
  ListeningWithCategory,
} from "@/types/database.types";

export async function getListenings(options?: {
  showDeleted?: boolean;
}): Promise<{ data: ListeningWithCategory[]; count: number }> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("listenings")
    .select("*, listening_categories(name)", { count: "exact" })
    .order("order_number", { ascending: true });

  if (!options?.showDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return {
    data: (data ?? []) as ListeningWithCategory[],
    count: count ?? 0,
  };
}

export async function getListening(id: number): Promise<Listening> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("listenings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Listening;
}

export async function createListening(
  values: ListeningInsert
): Promise<Listening> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("listenings")
    .insert(values)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Listening;
}

export async function updateListening(
  id: number,
  values: ListeningUpdate
): Promise<Listening> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("listenings")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Listening;
}

export async function softDeleteListening(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("listenings")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreListening(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("listenings")
    .update({ is_deleted: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

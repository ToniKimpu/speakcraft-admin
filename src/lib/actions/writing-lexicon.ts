"use server";

// Service-role (no auth cookie) so admin reads/writes bypass the read-only RLS
// on writing_lexicon — authenticated can only SELECT non-deleted rows.
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  WritingLexiconEntry,
  WritingLexiconInsert,
  WritingLexiconUpdate,
} from "@/types/database.types";

export async function getWritingLexicon(options?: {
  showDeleted?: boolean;
}): Promise<{ data: WritingLexiconEntry[]; count: number }> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("writing_lexicon")
    .select("*", { count: "exact" })
    .order("kind", { ascending: true })
    .order("id", { ascending: true });

  if (!options?.showDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as WritingLexiconEntry[], count: count ?? 0 };
}

export async function getWritingLexiconEntry(
  id: string
): Promise<WritingLexiconEntry> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("writing_lexicon")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as WritingLexiconEntry;
}

export async function createWritingLexiconEntry(
  values: WritingLexiconInsert
): Promise<WritingLexiconEntry> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("writing_lexicon")
    .insert(values)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WritingLexiconEntry;
}

export async function updateWritingLexiconEntry(
  id: string,
  values: WritingLexiconUpdate
): Promise<WritingLexiconEntry> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("writing_lexicon")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WritingLexiconEntry;
}

export async function softDeleteWritingLexiconEntry(
  id: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("writing_lexicon")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreWritingLexiconEntry(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("writing_lexicon")
    .update({ is_deleted: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

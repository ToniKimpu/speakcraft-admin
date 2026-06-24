"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PatternExample } from "@/types/database.types";

export async function getPatternExamplesByPattern(
  patternId: number
): Promise<PatternExample[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_examples")
    .select("*")
    .eq("pattern_id", patternId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PatternExample[];
}

export async function createPatternExample(
  patternId: number,
  values: {
    english_text: string;
    burmese_text?: string | null;
    audio_url?: string | null;
    start_at?: number;
    practicable?: boolean;
    explanation?: string | null;
    words?: string | null;
  }
): Promise<PatternExample> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_examples")
    .insert({
      pattern_id: patternId,
      start_at: 0,
      practicable: false,
      ...values,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PatternExample;
}

export async function updatePatternExample(
  id: number,
  values: {
    english_text?: string;
    burmese_text?: string | null;
    audio_url?: string | null;
    start_at?: number;
    practicable?: boolean;
    explanation?: string | null;
    words?: string | null;
  }
): Promise<PatternExample> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_examples")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PatternExample;
}

export async function softDeletePatternExample(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("pattern_examples")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

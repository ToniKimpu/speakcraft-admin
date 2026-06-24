"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PatternExercise } from "@/types/database.types";

export async function getPatternExercisesByExercise(
  exerciseId: number
): Promise<PatternExercise[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_exercises")
    .select("*")
    .eq("exercise_id", exerciseId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PatternExercise[];
}

export async function createPatternExercise(
  exerciseId: number,
  values: {
    burmese_text: string;
    english_text: string;
    words?: string | null;
    audio_path?: string | null;
  }
): Promise<PatternExercise> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_exercises")
    .insert({ exercise_id: exerciseId, ...values })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PatternExercise;
}

export async function updatePatternExercise(
  id: number,
  values: {
    burmese_text?: string;
    english_text?: string;
    words?: string | null;
    audio_path?: string | null;
  }
): Promise<PatternExercise> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_exercises")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PatternExercise;
}

export async function softDeletePatternExercise(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("pattern_exercises")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

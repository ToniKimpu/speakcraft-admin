"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PatternVocabulary } from "@/types/database.types";

export async function searchVocabularies(
  query: string
): Promise<PatternVocabulary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_vocabularies")
    .select("*")
    .ilike("english_text", `%${query}%`)
    .order("english_text", { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as PatternVocabulary[];
}

export async function getVocabulariesByPatternExample(
  exampleId: number
): Promise<PatternVocabulary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_examples_vocabularies_relation")
    .select("vocabulary_id, pattern_vocabularies(*)")
    .eq("pattern_example_id", exampleId);
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => row.pattern_vocabularies as PatternVocabulary);
}

export async function createVocabulary(values: {
  english_text: string;
  burmese_text: string;
  audio_path?: string | null;
}): Promise<PatternVocabulary> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_vocabularies")
    .insert(values)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PatternVocabulary;
}

export async function attachVocabularyToExample(
  exampleId: number,
  vocabularyId: number
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("pattern_examples_vocabularies_relation")
    .insert({
      pattern_example_id: exampleId,
      vocabulary_id: vocabularyId,
    });
  if (error) throw new Error(error.message);
}

export async function detachVocabularyFromExample(
  exampleId: number,
  vocabularyId: number
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("pattern_examples_vocabularies_relation")
    .delete()
    .eq("pattern_example_id", exampleId)
    .eq("vocabulary_id", vocabularyId);
  if (error) throw new Error(error.message);
}

// Exercise vocabulary operations
export async function getVocabulariesByPatternExercise(
  exerciseId: number
): Promise<PatternVocabulary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pattern_exercises_vocabularies_relation")
    .select("vocabulary_id, pattern_vocabularies(*)")
    .eq("pattern_exercise_id", exerciseId);
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => row.pattern_vocabularies as PatternVocabulary);
}

export async function attachVocabularyToPatternExercise(
  exerciseId: number,
  vocabularyId: number
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("pattern_exercises_vocabularies_relation")
    .insert({
      pattern_exercise_id: exerciseId,
      vocabulary_id: vocabularyId,
    });
  if (error) throw new Error(error.message);
}

export async function detachVocabularyFromPatternExercise(
  exerciseId: number,
  vocabularyId: number
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("pattern_exercises_vocabularies_relation")
    .delete()
    .eq("pattern_exercise_id", exerciseId)
    .eq("vocabulary_id", vocabularyId);
  if (error) throw new Error(error.message);
}

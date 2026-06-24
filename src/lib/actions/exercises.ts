"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Exercise } from "@/types/database.types";

export async function getExercisesByDay(dayId: number): Promise<Exercise[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("day_id", dayId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Exercise[];
}

export async function getExercise(id: number): Promise<Exercise> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Exercise;
}

export async function createExercise(
  dayId: number,
  values: { exercise_name: string }
): Promise<Exercise> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ day_id: dayId, ...values })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Exercise;
}

export async function updateExercise(
  id: number,
  values: { exercise_name?: string }
): Promise<Exercise> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exercises")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Exercise;
}

export async function softDeleteExercise(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("exercises")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

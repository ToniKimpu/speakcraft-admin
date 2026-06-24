"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Lesson } from "@/types/database.types";

export async function getLessonsByDay(dayId: number): Promise<Lesson[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("day_id", dayId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Lesson[];
}

export async function getLesson(id: number): Promise<Lesson> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Lesson;
}

export async function createLesson(
  dayId: number,
  values: { lesson_name: string; subtitle?: string | null }
): Promise<Lesson> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lessons")
    .insert({ day_id: dayId, ...values })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Lesson;
}

export async function updateLesson(
  id: number,
  values: { lesson_name?: string; subtitle?: string | null }
): Promise<Lesson> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lessons")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Lesson;
}

export async function softDeleteLesson(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("lessons")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

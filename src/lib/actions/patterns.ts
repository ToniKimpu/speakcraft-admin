"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Pattern } from "@/types/database.types";

export async function getPatternsByLesson(
  lessonId: number
): Promise<Pattern[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("is_deleted", false)
    .order("order_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pattern[];
}

export async function getPattern(id: number): Promise<Pattern> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Pattern;
}

export async function createPattern(
  lessonId: number,
  values: {
    pattern: string;
    title?: string | null;
    description?: string | null;
    file_path?: string | null;
    self_practicable?: boolean;
  }
): Promise<Pattern> {
  const supabase = await createServerSupabaseClient();

  // Get max order_number for this lesson
  const { data: existing } = await supabase
    .from("patterns")
    .select("order_number")
    .eq("lesson_id", lessonId)
    .eq("is_deleted", false)
    .order("order_number", { ascending: false })
    .limit(1);

  const newOrder =
    existing && existing.length > 0 ? existing[0].order_number + 1 : 0;

  const { data, error } = await supabase
    .from("patterns")
    .insert({
      lesson_id: lessonId,
      order_number: newOrder,
      self_practicable: values.self_practicable ?? true,
      ...values,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Pattern;
}

export async function updatePattern(
  id: number,
  values: {
    pattern?: string;
    title?: string | null;
    description?: string | null;
    file_path?: string | null;
    self_practicable?: boolean;
  }
): Promise<Pattern> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("patterns")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Pattern;
}

export async function softDeletePattern(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("patterns")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderPatterns(
  orderedItems: { id: number; order_number: number }[]
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  for (const item of orderedItems) {
    const { error } = await supabase
      .from("patterns")
      .update({ order_number: item.order_number })
      .eq("id", item.id);
    if (error) throw new Error(error.message);
  }
}

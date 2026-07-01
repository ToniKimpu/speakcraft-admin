"use server";

// Service-role (no auth cookie) so admin reads/writes bypass the read-only RLS
// on writing_lessons — authenticated can only SELECT published, non-deleted rows.
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  WritingLesson,
  WritingLessonInsert,
  WritingLessonUpdate,
} from "@/types/database.types";

export async function getWritingLessons(options?: {
  showDeleted?: boolean;
}): Promise<{ data: WritingLesson[]; count: number }> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("writing_lessons")
    .select("*", { count: "exact" })
    .order("level", { ascending: true })
    .order("section_id", { ascending: true })
    .order("order_in_level", { ascending: true });

  if (!options?.showDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as WritingLesson[], count: count ?? 0 };
}

export async function getWritingLesson(id: string): Promise<WritingLesson> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("writing_lessons")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as WritingLesson;
}

export async function createWritingLesson(
  values: WritingLessonInsert
): Promise<WritingLesson> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("writing_lessons")
    .insert(values)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WritingLesson;
}

export async function updateWritingLesson(
  id: string,
  values: WritingLessonUpdate
): Promise<WritingLesson> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("writing_lessons")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WritingLesson;
}

export async function softDeleteWritingLesson(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("writing_lessons")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreWritingLesson(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("writing_lessons")
    .update({ is_deleted: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

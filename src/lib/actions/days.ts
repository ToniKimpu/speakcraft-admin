"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Day } from "@/types/database.types";

export async function getDays(options?: {
  showDeleted?: boolean;
}): Promise<{ data: Day[]; count: number }> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("days")
    .select("*", { count: "exact" })
    .order("order_number", { ascending: true });

  if (!options?.showDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as Day[], count: count ?? 0 };
}

export async function getDay(id: number): Promise<Day> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("days")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Day;
}

export async function createDay(orderNumber: number): Promise<Day> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("days")
    .insert({ order_number: orderNumber })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Day;
}

export async function updateDay(
  id: number,
  orderNumber: number
): Promise<Day> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("days")
    .update({ order_number: orderNumber })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Day;
}

export async function softDeleteDay(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("days")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreDay(id: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("days")
    .update({ is_deleted: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderDays(
  orderedItems: { id: number; order_number: number }[]
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  for (const item of orderedItems) {
    const { error } = await supabase
      .from("days")
      .update({ order_number: item.order_number })
      .eq("id", item.id);
    if (error) throw new Error(error.message);
  }
}

export async function getDayLessonCount(dayId: number): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("day_id", dayId)
    .eq("is_deleted", false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getDayExerciseCount(dayId: number): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("exercises")
    .select("*", { count: "exact", head: true })
    .eq("day_id", dayId)
    .eq("is_deleted", false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

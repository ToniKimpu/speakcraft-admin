"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DailySpeakingTopic,
  DailySpeakingTopicInsert,
  DailySpeakingTopicUpdate,
} from "@/types/database.types";

export async function getDailySpeakingTopics(options?: {
  showDeleted?: boolean;
}): Promise<{ data: DailySpeakingTopic[]; count: number }> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("daily_speaking_topics")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!options?.showDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return {
    data: (data ?? []) as DailySpeakingTopic[],
    count: count ?? 0,
  };
}

export async function getDailySpeakingTopic(
  id: string
): Promise<DailySpeakingTopic> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("daily_speaking_topics")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as DailySpeakingTopic;
}

export async function createDailySpeakingTopic(
  values: DailySpeakingTopicInsert
): Promise<DailySpeakingTopic> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("daily_speaking_topics")
    .insert(values)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DailySpeakingTopic;
}

export async function updateDailySpeakingTopic(
  id: string,
  values: DailySpeakingTopicUpdate
): Promise<DailySpeakingTopic> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("daily_speaking_topics")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DailySpeakingTopic;
}

export async function softDeleteDailySpeakingTopic(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("daily_speaking_topics")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreDailySpeakingTopic(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("daily_speaking_topics")
    .update({ is_deleted: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

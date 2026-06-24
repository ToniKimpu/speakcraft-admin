"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLessonsByDay,
  getLesson,
  createLesson,
  updateLesson,
  softDeleteLesson,
} from "@/lib/actions/lessons";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";

export function useLessonsByDay(dayId: number) {
  return useQuery({
    queryKey: queryKeys.lessons.byDay(dayId),
    queryFn: () => getLessonsByDay(dayId),
  });
}

export function useLesson(id: number) {
  return useQuery({
    queryKey: queryKeys.lessons.detail(id),
    queryFn: () => getLesson(id),
  });
}

export function useCreateLesson(dayId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { lesson_name: string; subtitle?: string | null }) =>
      createLesson(dayId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessons.byDay(dayId),
      });
      toast.success("Lesson created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create lesson: ${error.message}`);
    },
  });
}

export function useUpdateLesson(dayId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: { lesson_name?: string; subtitle?: string | null };
    }) => updateLesson(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessons.byDay(dayId),
      });
      toast.success("Lesson updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update lesson: ${error.message}`);
    },
  });
}

export function useSoftDeleteLesson(dayId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteLesson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessons.byDay(dayId),
      });
      toast.success("Lesson deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete lesson: ${error.message}`);
    },
  });
}

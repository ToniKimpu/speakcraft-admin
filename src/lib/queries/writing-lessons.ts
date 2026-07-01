"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWritingLessons,
  getWritingLesson,
  createWritingLesson,
  updateWritingLesson,
  softDeleteWritingLesson,
  restoreWritingLesson,
} from "@/lib/actions/writing-lessons";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type {
  WritingLessonInsert,
  WritingLessonUpdate,
} from "@/types/database.types";

export function useWritingLessons(options?: { showDeleted?: boolean }) {
  return useQuery({
    queryKey: queryKeys.writingLessons.list({
      showDeleted: options?.showDeleted,
    }),
    queryFn: () => getWritingLessons(options),
  });
}

export function useWritingLesson(id: string) {
  return useQuery({
    queryKey: queryKeys.writingLessons.detail(id),
    queryFn: () => getWritingLesson(id),
    enabled: !!id,
  });
}

export function useCreateWritingLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: WritingLessonInsert) => createWritingLesson(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.writingLessons.all });
      toast.success("Lesson created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create lesson: ${error.message}`);
    },
  });
}

export function useUpdateWritingLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: WritingLessonUpdate }) =>
      updateWritingLesson(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.writingLessons.all });
      toast.success("Lesson updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update lesson: ${error.message}`);
    },
  });
}

export function useSoftDeleteWritingLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteWritingLesson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.writingLessons.all });
      toast.success("Lesson deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete lesson: ${error.message}`);
    },
  });
}

export function useRestoreWritingLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreWritingLesson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.writingLessons.all });
      toast.success("Lesson restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore lesson: ${error.message}`);
    },
  });
}

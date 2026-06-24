"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPatternsByLesson,
  getPattern,
  createPattern,
  updatePattern,
  softDeletePattern,
  reorderPatterns,
} from "@/lib/actions/patterns";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type { Pattern } from "@/types/database.types";

export function usePatternsByLesson(lessonId: number) {
  return useQuery({
    queryKey: queryKeys.patterns.byLesson(lessonId),
    queryFn: () => getPatternsByLesson(lessonId),
  });
}

export function usePattern(id: number) {
  return useQuery({
    queryKey: queryKeys.patterns.detail(id),
    queryFn: () => getPattern(id),
  });
}

export function useCreatePattern(lessonId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: {
      pattern: string;
      title?: string | null;
      description?: string | null;
      file_path?: string | null;
      self_practicable?: boolean;
    }) => createPattern(lessonId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patterns.byLesson(lessonId),
      });
      toast.success("Pattern created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create pattern: ${error.message}`);
    },
  });
}

export function useUpdatePattern(lessonId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: {
        pattern?: string;
        title?: string | null;
        description?: string | null;
        file_path?: string | null;
        self_practicable?: boolean;
      };
    }) => updatePattern(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patterns.byLesson(lessonId),
      });
      toast.success("Pattern updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update pattern: ${error.message}`);
    },
  });
}

export function useSoftDeletePattern(lessonId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeletePattern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patterns.byLesson(lessonId),
      });
      toast.success("Pattern deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete pattern: ${error.message}`);
    },
  });
}

export function useReorderPatterns(lessonId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedItems: { id: number; order_number: number }[]) =>
      reorderPatterns(orderedItems),
    onMutate: async (orderedItems) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.patterns.byLesson(lessonId),
      });
      const previous = queryClient.getQueryData(
        queryKeys.patterns.byLesson(lessonId)
      );
      queryClient.setQueryData(
        queryKeys.patterns.byLesson(lessonId),
        (old: Pattern[] | undefined) => {
          if (!old) return old;
          return orderedItems
            .map((item) => {
              const p = old.find((x) => x.id === item.id);
              return p ? { ...p, order_number: item.order_number } : null;
            })
            .filter(Boolean) as Pattern[];
        }
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.patterns.byLesson(lessonId),
          context.previous
        );
      }
      toast.error("Reorder failed. Reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patterns.byLesson(lessonId),
      });
    },
  });
}

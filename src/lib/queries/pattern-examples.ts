"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPatternExamplesByPattern,
  createPatternExample,
  updatePatternExample,
  softDeletePatternExample,
} from "@/lib/actions/pattern-examples";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";

export function usePatternExamplesByPattern(patternId: number) {
  return useQuery({
    queryKey: queryKeys.patternExamples.byPattern(patternId),
    queryFn: () => getPatternExamplesByPattern(patternId),
  });
}

export function useCreatePatternExample(patternId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: {
      english_text: string;
      burmese_text?: string | null;
      audio_url?: string | null;
      start_at?: number;
      practicable?: boolean;
      explanation?: string | null;
      words?: string | null;
    }) => createPatternExample(patternId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patternExamples.byPattern(patternId),
      });
      toast.success("Example created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create example: ${error.message}`);
    },
  });
}

export function useUpdatePatternExample(patternId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: {
        english_text?: string;
        burmese_text?: string | null;
        audio_url?: string | null;
        start_at?: number;
        practicable?: boolean;
        explanation?: string | null;
        words?: string | null;
      };
    }) => updatePatternExample(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patternExamples.byPattern(patternId),
      });
      toast.success("Example updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update example: ${error.message}`);
    },
  });
}

export function useSoftDeletePatternExample(patternId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeletePatternExample(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patternExamples.byPattern(patternId),
      });
      toast.success("Example deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete example: ${error.message}`);
    },
  });
}

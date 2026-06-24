"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPatternExercisesByExercise,
  createPatternExercise,
  updatePatternExercise,
  softDeletePatternExercise,
} from "@/lib/actions/pattern-exercises";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";

export function usePatternExercisesByExercise(exerciseId: number) {
  return useQuery({
    queryKey: queryKeys.patternExercises.byExercise(exerciseId),
    queryFn: () => getPatternExercisesByExercise(exerciseId),
  });
}

export function useCreatePatternExercise(exerciseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: {
      burmese_text: string;
      english_text: string;
      words?: string | null;
      audio_path?: string | null;
    }) => createPatternExercise(exerciseId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patternExercises.byExercise(exerciseId),
      });
      toast.success("Pattern exercise created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
}

export function useUpdatePatternExercise(exerciseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: {
        burmese_text?: string;
        english_text?: string;
        words?: string | null;
        audio_path?: string | null;
      };
    }) => updatePatternExercise(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patternExercises.byExercise(exerciseId),
      });
      toast.success("Pattern exercise updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useSoftDeletePatternExercise(exerciseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeletePatternExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.patternExercises.byExercise(exerciseId),
      });
      toast.success("Pattern exercise deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExercisesByDay,
  getExercise,
  createExercise,
  updateExercise,
  softDeleteExercise,
} from "@/lib/actions/exercises";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";

export function useExercisesByDay(dayId: number) {
  return useQuery({
    queryKey: queryKeys.exercises.byDay(dayId),
    queryFn: () => getExercisesByDay(dayId),
  });
}

export function useExercise(id: number) {
  return useQuery({
    queryKey: queryKeys.exercises.detail(id),
    queryFn: () => getExercise(id),
  });
}

export function useCreateExercise(dayId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { exercise_name: string }) =>
      createExercise(dayId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.exercises.byDay(dayId),
      });
      toast.success("Exercise created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create exercise: ${error.message}`);
    },
  });
}

export function useUpdateExercise(dayId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: { exercise_name?: string };
    }) => updateExercise(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.exercises.byDay(dayId),
      });
      toast.success("Exercise updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update exercise: ${error.message}`);
    },
  });
}

export function useSoftDeleteExercise(dayId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.exercises.byDay(dayId),
      });
      toast.success("Exercise deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete exercise: ${error.message}`);
    },
  });
}

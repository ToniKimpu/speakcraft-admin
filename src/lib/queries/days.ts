"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDays,
  getDay,
  createDay,
  updateDay,
  softDeleteDay,
  restoreDay,
  reorderDays,
} from "@/lib/actions/days";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type { Day } from "@/types/database.types";

export function useDays(options?: { showDeleted?: boolean }) {
  return useQuery({
    queryKey: queryKeys.days.list({ showDeleted: options?.showDeleted }),
    queryFn: () => getDays(options),
  });
}

export function useDay(id: number) {
  return useQuery({
    queryKey: queryKeys.days.detail(id),
    queryFn: () => getDay(id),
  });
}

export function useCreateDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: number) => createDay(orderNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.days.all });
      toast.success("Day created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create day: ${error.message}`);
    },
  });
}

export function useUpdateDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orderNumber }: { id: number; orderNumber: number }) =>
      updateDay(id, orderNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.days.all });
      toast.success("Day updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update day: ${error.message}`);
    },
  });
}

export function useSoftDeleteDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteDay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.days.all });
      toast.success("Day deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete day: ${error.message}`);
    },
  });
}

export function useRestoreDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreDay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.days.all });
      toast.success("Day restored successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore day: ${error.message}`);
    },
  });
}

export function useReorderDays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedItems: { id: number; order_number: number }[]) =>
      reorderDays(orderedItems),
    onMutate: async (orderedItems) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.days.all });
      const previous = queryClient.getQueryData(
        queryKeys.days.list({ showDeleted: false })
      );
      queryClient.setQueryData(
        queryKeys.days.list({ showDeleted: false }),
        (old: { data: Day[]; count: number } | undefined) => {
          if (!old) return old;
          const reordered = orderedItems
            .map((item) => {
              const day = old.data.find((d) => d.id === item.id);
              return day ? { ...day, order_number: item.order_number } : null;
            })
            .filter(Boolean) as Day[];
          return { ...old, data: reordered };
        }
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.days.list({ showDeleted: false }),
          context.previous
        );
      }
      toast.error("Reorder failed. Reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.days.all });
    },
  });
}

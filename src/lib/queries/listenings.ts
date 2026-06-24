"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getListenings,
  getListening,
  createListening,
  updateListening,
  softDeleteListening,
  restoreListening,
} from "@/lib/actions/listenings";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type { ListeningInsert, ListeningUpdate } from "@/types/database.types";

export function useListenings(options?: { showDeleted?: boolean }) {
  return useQuery({
    queryKey: queryKeys.listenings.list({ showDeleted: options?.showDeleted }),
    queryFn: () => getListenings(options),
  });
}

export function useListening(id: number) {
  return useQuery({
    queryKey: queryKeys.listenings.detail(id),
    queryFn: () => getListening(id),
  });
}

export function useCreateListening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ListeningInsert) => createListening(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listenings.all });
      toast.success("Listening created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create listening: ${error.message}`);
    },
  });
}

export function useUpdateListening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: ListeningUpdate;
    }) => updateListening(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listenings.all });
      toast.success("Listening updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update listening: ${error.message}`);
    },
  });
}

export function useSoftDeleteListening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteListening(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listenings.all });
      toast.success("Listening deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete listening: ${error.message}`);
    },
  });
}

export function useRestoreListening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreListening(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listenings.all });
      toast.success("Listening restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore listening: ${error.message}`);
    },
  });
}

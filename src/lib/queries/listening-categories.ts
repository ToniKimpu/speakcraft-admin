"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getListeningCategories,
  createListeningCategory,
  updateListeningCategory,
  softDeleteListeningCategory,
  restoreListeningCategory,
} from "@/lib/actions/listening-categories";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";

export function useListeningCategories(options?: { showDeleted?: boolean }) {
  return useQuery({
    queryKey: queryKeys.listeningCategories.list(),
    queryFn: () => getListeningCategories(options),
  });
}

export function useCreateListeningCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createListeningCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.listeningCategories.all,
      });
      toast.success("Category created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdateListeningCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updateListeningCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.listeningCategories.all,
      });
      toast.success("Category updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useSoftDeleteListeningCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteListeningCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.listeningCategories.all,
      });
      toast.success("Category deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

export function useRestoreListeningCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreListeningCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.listeningCategories.all,
      });
      toast.success("Category restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore category: ${error.message}`);
    },
  });
}

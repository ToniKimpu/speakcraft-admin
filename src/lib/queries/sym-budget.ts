"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSymBudgetConfig,
  updateSymBudgetConfig,
} from "@/lib/actions/sym-budget";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type { SymBudgetConfigUpdate } from "@/types/database.types";

export function useSymBudgetConfig() {
  return useQuery({
    queryKey: queryKeys.symBudget.detail(),
    queryFn: () => getSymBudgetConfig(),
  });
}

export function useUpdateSymBudgetConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SymBudgetConfigUpdate) =>
      updateSymBudgetConfig(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.symBudget.all });
      toast.success("Token budgets saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save budgets: ${error.message}`);
    },
  });
}

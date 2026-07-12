"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionPlans,
  grantSubscription,
  endPremium,
  updatePlanPrice,
} from "@/lib/actions/subscriptions";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans.all,
    queryFn: getSubscriptionPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePlanPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlanPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionPlans.all });
      toast.success("Price updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update price: ${error.message}`);
    },
  });
}

export function useGrantSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: grantSubscription,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.subscriptions(variables.userId),
      });
      toast.success("Subscription granted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant subscription: ${error.message}`);
    },
  });
}

export function useEndPremium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => endPremium(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("Premium ended");
    },
    onError: (error: Error) => {
      toast.error(`Failed to end premium: ${error.message}`);
    },
  });
}

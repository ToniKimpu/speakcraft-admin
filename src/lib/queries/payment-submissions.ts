"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPaymentSubmissions,
  approvePaymentSubmission,
  rejectPaymentSubmission,
  revokePaymentSubmission,
} from "@/lib/actions/payment-submissions";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";

export function usePaymentSubmissions(options?: {
  status?: "pending" | "approved" | "rejected";
}) {
  return useQuery({
    queryKey: queryKeys.paymentSubmissions.list({ status: options?.status }),
    queryFn: () => getPaymentSubmissions(options),
  });
}

export function useApprovePaymentSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: number) =>
      approvePaymentSubmission(submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentSubmissions.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("Payment approved — premium granted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });
}

export function useRejectPaymentSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { submissionId: number; reason: string }) =>
      rejectPaymentSubmission(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentSubmissions.all,
      });
      toast.success("Payment rejected");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });
}

export function useRevokePaymentSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { submissionId: number; reason: string }) =>
      revokePaymentSubmission(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentSubmissions.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("Payment revoked — premium ended");
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke: ${error.message}`);
    },
  });
}

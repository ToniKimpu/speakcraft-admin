"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/lib/actions/payment-methods";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type {
  PaymentMethodInsert,
  PaymentMethodUpdate,
} from "@/types/database.types";

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.list(),
    queryFn: () => getPaymentMethods(),
  });
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: PaymentMethodInsert) => createPaymentMethod(values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all,
      });
      toast.success("Payment method created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create payment method: ${error.message}`);
    },
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: PaymentMethodUpdate }) =>
      updatePaymentMethod(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all,
      });
      toast.success("Payment method updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payment method: ${error.message}`);
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all,
      });
      toast.success("Payment method deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete payment method: ${error.message}`);
    },
  });
}

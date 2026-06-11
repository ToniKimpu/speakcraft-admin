"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDailySpeakingTopics,
  getDailySpeakingTopic,
  createDailySpeakingTopic,
  updateDailySpeakingTopic,
  softDeleteDailySpeakingTopic,
  restoreDailySpeakingTopic,
} from "@/lib/actions/daily-speaking-topics";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type {
  DailySpeakingTopicInsert,
  DailySpeakingTopicUpdate,
} from "@/types/database.types";

export function useDailySpeakingTopics(options?: { showDeleted?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dailySpeakingTopics.list({
      showDeleted: options?.showDeleted,
    }),
    queryFn: () => getDailySpeakingTopics(options),
  });
}

export function useDailySpeakingTopic(id: string) {
  return useQuery({
    queryKey: queryKeys.dailySpeakingTopics.detail(id),
    queryFn: () => getDailySpeakingTopic(id),
    enabled: !!id,
  });
}

export function useCreateDailySpeakingTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: DailySpeakingTopicInsert) =>
      createDailySpeakingTopic(values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dailySpeakingTopics.all,
      });
      toast.success("Topic created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create topic: ${error.message}`);
    },
  });
}

export function useUpdateDailySpeakingTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: DailySpeakingTopicUpdate;
    }) => updateDailySpeakingTopic(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dailySpeakingTopics.all,
      });
      toast.success("Topic updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update topic: ${error.message}`);
    },
  });
}

export function useSoftDeleteDailySpeakingTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteDailySpeakingTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dailySpeakingTopics.all,
      });
      toast.success("Topic deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete topic: ${error.message}`);
    },
  });
}

export function useRestoreDailySpeakingTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreDailySpeakingTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dailySpeakingTopics.all,
      });
      toast.success("Topic restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore topic: ${error.message}`);
    },
  });
}

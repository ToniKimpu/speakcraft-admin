"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAppVersions,
  getAppVersion,
  createAppVersion,
  updateAppVersion,
  softDeleteAppVersion,
  restoreAppVersion,
} from "@/lib/actions/app-versions";
import { queryKeys } from "@/lib/queries/query-keys";
import { toast } from "sonner";
import type {
  AppVersionInsert,
  AppVersionUpdate,
} from "@/types/database.types";

export function useAppVersions(options?: { showDeleted?: boolean }) {
  return useQuery({
    queryKey: queryKeys.appVersions.list({ showDeleted: options?.showDeleted }),
    queryFn: () => getAppVersions(options),
  });
}

export function useAppVersion(id: number) {
  return useQuery({
    queryKey: queryKeys.appVersions.detail(id),
    queryFn: () => getAppVersion(id),
    enabled: !!id,
  });
}

export function useCreateAppVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AppVersionInsert) => createAppVersion(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appVersions.all });
      toast.success("Version created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });
}

export function useUpdateAppVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: AppVersionUpdate }) =>
      updateAppVersion(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appVersions.all });
      toast.success("Version updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update version: ${error.message}`);
    },
  });
}

export function useSoftDeleteAppVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteAppVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appVersions.all });
      toast.success("Version deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete version: ${error.message}`);
    },
  });
}

export function useRestoreAppVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreAppVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appVersions.all });
      toast.success("Version restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore version: ${error.message}`);
    },
  });
}

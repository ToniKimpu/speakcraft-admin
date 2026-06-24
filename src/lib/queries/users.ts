"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsers, getUserSubscriptions } from "@/lib/actions/users";
import { queryKeys } from "@/lib/queries/query-keys";

export function useUsers(options?: { search?: string }) {
  return useQuery({
    queryKey: queryKeys.users.list({ search: options?.search ?? "" }),
    queryFn: () => getUsers(options),
  });
}

export function useUserSubscriptions(userId: number | null) {
  return useQuery({
    queryKey: queryKeys.users.subscriptions(userId ?? 0),
    queryFn: () => getUserSubscriptions(userId as number),
    enabled: userId != null,
  });
}

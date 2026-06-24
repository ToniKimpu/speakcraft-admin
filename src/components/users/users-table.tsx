"use client";

import { useState, useMemo, useCallback } from "react";
import { useUsers } from "@/lib/queries/users";
import {
  getUsersColumns,
  isPremium,
} from "@/components/users/users-table-columns";
import { GrantSubscriptionDialog } from "@/components/users/grant-subscription-dialog";
import { SubscriptionHistoryDialog } from "@/components/users/subscription-history-dialog";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCards } from "@/components/shared/stats-cards";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEndPremium } from "@/lib/queries/subscriptions";
import { Crown, Loader2, Users as UsersIcon, UserRound } from "lucide-react";
import type { User } from "@/types/database.types";

export function UsersTable() {
  const [search, setSearch] = useState("");
  const [grantUser, setGrantUser] = useState<User | null>(null);
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [endUser, setEndUser] = useState<User | null>(null);

  const { data, isLoading } = useUsers({ search });
  const endPremium = useEndPremium();

  const handleGrant = useCallback((user: User) => setGrantUser(user), []);
  const handleHistory = useCallback((user: User) => setHistoryUser(user), []);
  const handleEndPremium = useCallback((user: User) => setEndUser(user), []);

  const columns = useMemo(
    () =>
      getUsersColumns({
        onGrant: handleGrant,
        onHistory: handleHistory,
        onEndPremium: handleEndPremium,
      }),
    [handleGrant, handleHistory, handleEndPremium]
  );

  const users = data?.data ?? [];
  const premiumCount = users.filter(isPremium).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage users and subscriptions" />

      <StatsCards
        stats={[
          { label: "Total Users", value: data?.count ?? 0, icon: UsersIcon },
          { label: "Premium", value: premiumCount, icon: Crown },
          {
            label: "Free",
            value: (data?.count ?? 0) - premiumCount,
            icon: UserRound,
          },
        ]}
      />

      <Input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No users found."
      />

      <GrantSubscriptionDialog
        open={!!grantUser}
        onOpenChange={(open) => !open && setGrantUser(null)}
        user={grantUser}
      />

      <SubscriptionHistoryDialog
        open={!!historyUser}
        onOpenChange={(open) => !open && setHistoryUser(null)}
        user={historyUser}
      />

      <AlertDialog
        open={!!endUser}
        onOpenChange={(open) => !open && setEndUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End premium now?</AlertDialogTitle>
            <AlertDialogDescription>
              {endUser?.email} will lose premium access immediately, and any
              active subscription is marked expired. This cannot be undone (you
              can grant again afterward).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endPremium.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (endUser) {
                  endPremium.mutate(endUser.id);
                  setEndUser(null);
                }
              }}
              disabled={endPremium.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {endPremium.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              End premium
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

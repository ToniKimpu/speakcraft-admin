"use client";

import { useUserSubscriptions } from "@/lib/queries/users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types/database.types";

interface SubscriptionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SubscriptionHistoryDialog({
  open,
  onOpenChange,
  user,
}: SubscriptionHistoryDialogProps) {
  const { data, isLoading } = useUserSubscriptions(open ? user?.id ?? null : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Subscription history</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : data && data.length > 0 ? (
            data.map((sub) => (
              <div
                key={sub.id}
                className="flex items-start justify-between rounded-md border p-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {sub.subscription_plans?.name ?? `Plan #${sub.plan_id}`}
                    </span>
                    <Badge
                      variant={
                        sub.status === "active"
                          ? "success"
                          : sub.status === "refunded"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(sub.started_at)} →{" "}
                    {formatDate(sub.current_period_end)}
                  </p>
                  {sub.payment_ref && (
                    <p className="text-xs text-muted-foreground">
                      Ref: {sub.payment_ref}
                    </p>
                  )}
                  {sub.note && (
                    <p className="text-xs text-muted-foreground">{sub.note}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  {sub.provider}
                </span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No subscriptions yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

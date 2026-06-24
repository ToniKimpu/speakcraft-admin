"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type {
  PaymentSubmissionStatus,
  PaymentSubmissionWithUser,
} from "@/types/database.types";

const STATUS_VARIANT: Record<
  PaymentSubmissionStatus,
  "warning" | "success" | "destructive"
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

interface ColumnActions {
  onReview: (submission: PaymentSubmissionWithUser) => void;
}

export function getPaymentSubmissionsColumns(
  actions: ColumnActions
): ColumnDef<PaymentSubmissionWithUser>[] {
  return [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => {
        const u = row.original.users;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{u?.name || "—"}</span>
            <span className="text-xs text-muted-foreground">
              {u?.email ?? ""}
              {u?.account_id ? ` · ${u.account_id}` : ""}
            </span>
          </div>
        );
      },
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.amount.toLocaleString()} {row.original.currency}
        </span>
      ),
    },
    {
      accessorKey: "method_label",
      header: "Method",
    },
    {
      accessorKey: "plan_code",
      header: "Plan",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.plan_code}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Submitted",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {fmtDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            actions.onReview(row.original);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Review
        </Button>
      ),
    },
  ];
}

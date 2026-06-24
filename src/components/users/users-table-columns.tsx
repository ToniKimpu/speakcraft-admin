"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  Ban,
  CreditCard,
  History,
  MoreHorizontal,
} from "lucide-react";
import type { User } from "@/types/database.types";

export function isPremium(user: User): boolean {
  return !!user.premium_until && new Date(user.premium_until) > new Date();
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ColumnActions {
  onGrant: (user: User) => void;
  onHistory: (user: User) => void;
  onEndPremium: (user: User) => void;
}

export function getUsersColumns(actions: ColumnActions): ColumnDef<User>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name || "—"}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const premium = isPremium(row.original);
        return (
          <Badge variant={premium ? "success" : "secondary"}>
            {premium ? "Premium" : "Free"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "premium_until",
      header: "Premium until",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.premium_until)}
        </span>
      ),
    },
    {
      accessorKey: "total_token_used",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Tokens used
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {(row.original.total_token_used ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onGrant(user)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Grant premium (manual)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onHistory(user)}>
                <History className="mr-2 h-4 w-4" />
                View Subscriptions
              </DropdownMenuItem>
              {isPremium(user) && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => actions.onEndPremium(user)}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  End premium now
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

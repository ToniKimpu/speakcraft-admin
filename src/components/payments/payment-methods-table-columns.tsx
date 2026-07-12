"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { PaymentMethod } from "@/types/database.types";

interface ColumnActions {
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
}

export function getPaymentMethodsColumns(
  actions: ColumnActions
): ColumnDef<PaymentMethod>[] {
  return [
    {
      accessorKey: "sort_order",
      header: "#",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("sort_order")}</span>
      ),
    },
    {
      accessorKey: "display_name",
      header: "Method",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.display_name}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {row.original.type}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "account_number",
      header: "Account",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm">
            {row.original.account_number}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.account_name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue("is_active") as boolean;
        return (
          <Badge variant={active ? "success" : "secondary"}>
            {active ? "Active" : "Hidden"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const method = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(method)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => actions.onDelete(method)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

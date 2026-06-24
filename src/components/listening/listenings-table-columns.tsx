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
  Eye,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { ListeningWithCategory } from "@/types/database.types";

interface ColumnActions {
  onView: (listening: ListeningWithCategory) => void;
  onEdit: (listening: ListeningWithCategory) => void;
  onDelete: (listening: ListeningWithCategory) => void;
  onRestore: (listening: ListeningWithCategory) => void;
}

export function getListeningsColumns(
  actions: ColumnActions
): ColumnDef<ListeningWithCategory>[] {
  return [
    {
      accessorKey: "order_number",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Order #
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("order_number")}</span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-medium max-w-xs truncate block">
          {row.getValue("title")}
        </span>
      ),
    },
    {
      accessorKey: "youtube_id",
      header: "YouTube ID",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.getValue("youtube_id")}
        </span>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        const name = row.original.listening_categories?.name;
        return name ? (
          <Badge variant="secondary">{name}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      accessorKey: "mm_subtitle",
      header: "MM Sub",
      cell: ({ row }) => (
        <Badge
          variant={row.getValue("mm_subtitle") ? "success" : "secondary"}
        >
          {row.getValue("mm_subtitle") ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_free",
      header: "Access",
      cell: ({ row }) => (
        <Badge variant={row.getValue("is_free") ? "success" : "secondary"}>
          {row.getValue("is_free") ? "Free" : "Premium"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_deleted",
      header: "Status",
      cell: ({ row }) => {
        const isDeleted = row.getValue("is_deleted") as boolean;
        return (
          <Badge variant={isDeleted ? "destructive" : "success"}>
            {isDeleted ? "Deleted" : "Active"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at") as string);
        return (
          <span className="text-muted-foreground text-xs">
            {date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const listening = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(listening)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(listening)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {listening.is_deleted ? (
                <DropdownMenuItem
                  onClick={() => actions.onRestore(listening)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => actions.onDelete(listening)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { WritingLexiconEntry } from "@/types/database.types";

interface ColumnActions {
  onEdit: (entry: WritingLexiconEntry) => void;
  onDelete: (entry: WritingLexiconEntry) => void;
  onRestore: (entry: WritingLexiconEntry) => void;
}

export function getWritingLexiconColumns(
  actions: ColumnActions
): ColumnDef<WritingLexiconEntry>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "kind",
      header: "Kind",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue("kind")}</Badge>
      ),
    },
    {
      id: "preview",
      header: "Preview",
      cell: ({ row }) => {
        const d = row.original.data as Record<string, unknown>;
        const en = (d.en ?? (d.forms as Record<string, unknown>)?.base) as
          | string
          | undefined;
        const mm = d.mm as string | undefined;
        return (
          <span className="text-xs max-w-sm truncate block">
            {en && <span className="font-medium">{en}</span>}
            {mm && <span className="text-muted-foreground"> · {mm}</span>}
          </span>
        );
      },
    },
    {
      id: "visibility",
      header: "Visibility",
      cell: ({ row }) => {
        const e = row.original;
        if (e.is_deleted) return <Badge variant="destructive">Deleted</Badge>;
        return <Badge variant="success">Live</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(entry)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {entry.is_deleted ? (
                <DropdownMenuItem onClick={() => actions.onRestore(entry)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => actions.onDelete(entry)}
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

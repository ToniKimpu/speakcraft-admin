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
import type { AppVersion } from "@/types/database.types";

interface ColumnActions {
  onEdit: (v: AppVersion) => void;
  onDelete: (v: AppVersion) => void;
  onRestore: (v: AppVersion) => void;
  currentId: number | null; // highest non-deleted build = the row the app uses
}

export function getAppVersionsColumns(
  actions: ColumnActions
): ColumnDef<AppVersion>[] {
  return [
    {
      accessorKey: "build_number",
      header: "Build",
      cell: ({ row }) => {
        const v = row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">#{v.build_number}</span>
            {!v.is_deleted && v.id === actions.currentId && (
              <Badge variant="success">Live</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "version_name",
      header: "Version",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("version_name")}</span>
      ),
    },
    {
      accessorKey: "force_update",
      header: "Force update",
      cell: ({ row }) =>
        row.getValue("force_update") ? (
          <Badge variant="destructive">Forced</Badge>
        ) : (
          <Badge variant="secondary">Optional</Badge>
        ),
    },
    {
      id: "links",
      header: "Links",
      cell: ({ row }) => {
        const v = row.original;
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {v.app_path ? "APK" : "—"}
            {v.telegram_path ? " · TG" : ""}
            {v.audio_path ? " · audio" : ""}
          </span>
        );
      },
    },
    {
      id: "visibility",
      header: "Status",
      cell: ({ row }) =>
        row.original.is_deleted ? (
          <Badge variant="destructive">Deleted</Badge>
        ) : (
          <Badge variant="secondary">Active</Badge>
        ),
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
        const v = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(v)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {v.is_deleted ? (
                <DropdownMenuItem onClick={() => actions.onRestore(v)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => actions.onDelete(v)}
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

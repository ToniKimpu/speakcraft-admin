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
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { WritingLesson } from "@/types/database.types";

interface ColumnActions {
  onEdit: (lesson: WritingLesson) => void;
  onDelete: (lesson: WritingLesson) => void;
  onRestore: (lesson: WritingLesson) => void;
}

export function getWritingLessonsColumns(
  actions: ColumnActions
): ColumnDef<WritingLesson>[] {
  return [
    {
      accessorKey: "level",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Lvl
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">L{row.getValue("level")}</span>
      ),
    },
    {
      accessorKey: "section",
      header: "Section",
      cell: ({ row }) => {
        const l = row.original;
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {l.section_id} · {l.section}
          </span>
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const l = row.original;
        return (
          <div className="max-w-xs">
            <span className="font-medium truncate block">{l.title}</span>
            <span className="text-muted-foreground text-xs font-mono">
              {l.id}
            </span>
          </div>
        );
      },
    },
    {
      id: "content",
      header: "Content",
      cell: ({ row }) => {
        const l = row.original;
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {Array.isArray(l.exercises) ? l.exercises.length : 0} exercises
          </span>
        );
      },
    },
    {
      id: "visibility",
      header: "Visibility",
      cell: ({ row }) => {
        const l = row.original;
        if (l.is_deleted) return <Badge variant="destructive">Deleted</Badge>;
        return l.is_published ? (
          <Badge variant="success">Live</Badge>
        ) : (
          <Badge variant="secondary">Draft</Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const lesson = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(lesson)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {lesson.is_deleted ? (
                <DropdownMenuItem onClick={() => actions.onRestore(lesson)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => actions.onDelete(lesson)}
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

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
import type {
  DailySpeakingTopic,
  TopicDifficulty,
} from "@/types/database.types";

interface ColumnActions {
  onEdit: (topic: DailySpeakingTopic) => void;
  onDelete: (topic: DailySpeakingTopic) => void;
  onRestore: (topic: DailySpeakingTopic) => void;
}

const difficultyVariant: Record<
  TopicDifficulty,
  "success" | "secondary" | "destructive"
> = {
  beginner: "success",
  intermediate: "secondary",
  advanced: "destructive",
};

export function getDailySpeakingTopicsColumns(
  actions: ColumnActions
): ColumnDef<DailySpeakingTopic>[] {
  return [
    {
      accessorKey: "sort_order",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Order
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("sort_order")}</span>
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
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const d = row.getValue("difficulty") as TopicDifficulty;
        return <Badge variant={difficultyVariant[d]}>{d}</Badge>;
      },
    },
    {
      id: "content",
      header: "Content",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {t.vocabulary?.length ?? 0} vocab · {t.target_phrases?.length ?? 0}{" "}
            phrases · {t.warmup_questions?.length ?? 0} qs
          </span>
        );
      },
    },
    {
      accessorKey: "is_published",
      header: "Published",
      cell: ({ row }) => (
        <Badge variant={row.getValue("is_published") ? "success" : "secondary"}>
          {row.getValue("is_published") ? "Live" : "Draft"}
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
        const topic = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(topic)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {topic.is_deleted ? (
                <DropdownMenuItem onClick={() => actions.onRestore(topic)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => actions.onDelete(topic)}
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

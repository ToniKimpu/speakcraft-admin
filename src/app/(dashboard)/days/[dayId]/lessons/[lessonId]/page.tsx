"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLesson } from "@/lib/queries/lessons";
import {
  usePatternsByLesson,
  useSoftDeletePattern,
} from "@/lib/queries/patterns";
import { useUIStore } from "@/stores/ui-store";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PatternFormSheet } from "@/components/days/pattern-form-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Pattern } from "@/types/database.types";

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ dayId: string; lessonId: string }>;
}) {
  const { dayId: dayIdStr, lessonId: lessonIdStr } = use(params);
  const dayId = Number(dayIdStr);
  const lessonId = Number(lessonIdStr);
  const router = useRouter();
  const setBreadcrumbLabel = useUIStore((s) => s.setBreadcrumbLabel);

  const { data: lesson, isLoading: lessonLoading } = useLesson(lessonId);
  const { data: patterns, isLoading: patternsLoading } =
    usePatternsByLesson(lessonId);
  const deletePattern = useSoftDeletePattern(lessonId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [deletingPattern, setDeletingPattern] = useState<Pattern | null>(null);

  useEffect(() => {
    if (lesson) {
      setBreadcrumbLabel("lessons", lesson.id, lesson.lesson_name);
    }
  }, [lesson, setBreadcrumbLabel]);

  const columns: ColumnDef<Pattern>[] = [
    {
      accessorKey: "order_number",
      header: "Order #",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("order_number")}</span>
      ),
    },
    {
      accessorKey: "pattern",
      header: "Pattern",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("pattern")}</span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("title") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "file_path",
      header: "File Path",
      cell: ({ row }) => {
        const path = row.getValue("file_path") as string | null;
        return (
          <span className="text-muted-foreground text-xs">
            {path ? path.substring(0, 30) + "..." : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const pattern = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setBreadcrumbLabel("patterns", pattern.id, pattern.pattern);
                  router.push(
                    `/days/${dayId}/lessons/${lessonId}/patterns/${pattern.id}`
                  );
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Examples
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingPattern(pattern);
                  setFormOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingPattern(pattern)}
                className="text-destructive focus:text-destructive"
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

  if (lessonLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lesson) return <p>Lesson not found.</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={lesson.lesson_name}
        description={lesson.subtitle || undefined}
      >
        <Button
          onClick={() => {
            setEditingPattern(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Pattern
        </Button>
        <Button variant="outline" onClick={() => router.push(`/days/${dayId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Day
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={patterns ?? []}
        isLoading={patternsLoading}
        onRowClick={(pattern) => {
          setBreadcrumbLabel("patterns", pattern.id, pattern.pattern);
          router.push(
            `/days/${dayId}/lessons/${lessonId}/patterns/${pattern.id}`
          );
        }}
        emptyMessage="No patterns yet. Add your first pattern."
      />

      <PatternFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        lessonId={lessonId}
        pattern={editingPattern}
      />

      <DeleteConfirmDialog
        open={!!deletingPattern}
        onOpenChange={(open) => !open && setDeletingPattern(null)}
        title={`Delete pattern "${deletingPattern?.pattern}"?`}
        onConfirm={() => {
          if (deletingPattern) {
            deletePattern.mutate(deletingPattern.id);
            setDeletingPattern(null);
          }
        }}
        isLoading={deletePattern.isPending}
      />
    </div>
  );
}

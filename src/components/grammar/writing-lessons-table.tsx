"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  useWritingLessons,
  useSoftDeleteWritingLesson,
  useRestoreWritingLesson,
} from "@/lib/queries/writing-lessons";
import { getWritingLessonsColumns } from "@/components/grammar/writing-lessons-table-columns";
import { WritingLessonFormSheet } from "@/components/grammar/writing-lesson-form-sheet";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCards } from "@/components/shared/stats-cards";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BookA, CheckCircle, Plus, SpellCheck, Trash2 } from "lucide-react";
import type { WritingLesson } from "@/types/database.types";

export function WritingLessonsTable() {
  const [showDeleted, setShowDeleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WritingLesson | null>(null);
  const [toDelete, setToDelete] = useState<WritingLesson | null>(null);

  const { data, isLoading } = useWritingLessons({ showDeleted });
  const softDelete = useSoftDeleteWritingLesson();
  const restore = useRestoreWritingLesson();

  const handleEdit = useCallback((lesson: WritingLesson) => {
    setEditing(lesson);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((lesson: WritingLesson) => {
    setToDelete(lesson);
  }, []);

  const handleRestore = useCallback(
    (lesson: WritingLesson) => {
      restore.mutate(lesson.id);
    },
    [restore]
  );

  const columns = useMemo(
    () =>
      getWritingLessonsColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onRestore: handleRestore,
      }),
    [handleEdit, handleDelete, handleRestore]
  );

  const published = data?.data?.filter((l) => l.is_published).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grammar"
        description="Manage grammar units (writing_lessons)"
      >
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/grammar/lexicon" />}
        >
          <BookA className="mr-2 h-4 w-4" />
          Lexicon
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lesson
        </Button>
      </PageHeader>

      <StatsCards
        stats={[
          { label: "Total", value: data?.count ?? 0, icon: SpellCheck },
          { label: "Published", value: published, icon: CheckCircle },
          {
            label: "Deleted",
            value: data?.data?.filter((l) => l.is_deleted).length ?? 0,
            icon: Trash2,
          },
        ]}
      />

      <div className="flex items-center gap-2">
        <Switch
          id="show-deleted-lessons"
          checked={showDeleted}
          onCheckedChange={setShowDeleted}
        />
        <Label htmlFor="show-deleted-lessons">Show deleted</Label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={handleEdit}
        emptyTitle="No lessons"
        emptyMessage="Create your first grammar unit to get started."
      />

      <WritingLessonFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        lesson={editing}
      />

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete "${toDelete?.title}"?`}
        onConfirm={() => {
          if (toDelete) {
            softDelete.mutate(toDelete.id);
            setToDelete(null);
          }
        }}
        isLoading={softDelete.isPending}
      />
    </div>
  );
}

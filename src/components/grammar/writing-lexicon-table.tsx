"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  useWritingLexicon,
  useSoftDeleteWritingLexiconEntry,
  useRestoreWritingLexiconEntry,
} from "@/lib/queries/writing-lexicon";
import { getWritingLexiconColumns } from "@/components/grammar/writing-lexicon-table-columns";
import { WritingLexiconFormSheet } from "@/components/grammar/writing-lexicon-form-sheet";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCards } from "@/components/shared/stats-cards";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookA, Plus, Trash2 } from "lucide-react";
import type { WritingLexiconEntry } from "@/types/database.types";

export function WritingLexiconTable() {
  const [showDeleted, setShowDeleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WritingLexiconEntry | null>(null);
  const [toDelete, setToDelete] = useState<WritingLexiconEntry | null>(null);

  const { data, isLoading } = useWritingLexicon({ showDeleted });
  const softDelete = useSoftDeleteWritingLexiconEntry();
  const restore = useRestoreWritingLexiconEntry();

  const handleEdit = useCallback((entry: WritingLexiconEntry) => {
    setEditing(entry);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((entry: WritingLexiconEntry) => {
    setToDelete(entry);
  }, []);

  const handleRestore = useCallback(
    (entry: WritingLexiconEntry) => {
      restore.mutate(entry.id);
    },
    [restore]
  );

  const columns = useMemo(
    () =>
      getWritingLexiconColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onRestore: handleRestore,
      }),
    [handleEdit, handleDelete, handleRestore]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grammar Lexicon"
        description="Shared verb / time-word / adjective / noun banks"
      >
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/grammar" />}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Lessons
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </PageHeader>

      <StatsCards
        stats={[
          { label: "Total", value: data?.count ?? 0, icon: BookA },
          {
            label: "Verbs",
            value: data?.data?.filter((e) => e.kind === "verb").length ?? 0,
            icon: BookA,
          },
          {
            label: "Deleted",
            value: data?.data?.filter((e) => e.is_deleted).length ?? 0,
            icon: Trash2,
          },
        ]}
      />

      <div className="flex items-center gap-2">
        <Switch
          id="show-deleted-lexicon"
          checked={showDeleted}
          onCheckedChange={setShowDeleted}
        />
        <Label htmlFor="show-deleted-lexicon">Show deleted</Label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={handleEdit}
        emptyTitle="No entries"
        emptyMessage="Add a lexicon entry to get started."
      />

      <WritingLexiconFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editing}
      />

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete "${toDelete?.id}"?`}
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

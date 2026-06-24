"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useListenings,
  useSoftDeleteListening,
  useRestoreListening,
} from "@/lib/queries/listenings";
import { getListeningsColumns } from "@/components/listening/listenings-table-columns";
import { ListeningFormSheet } from "@/components/listening/listening-form-sheet";
import { ListeningCategoryDialog } from "@/components/listening/listening-category-dialog";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCards } from "@/components/shared/stats-cards";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Headphones, Plus, Settings, Trash2 } from "lucide-react";
import type { Listening, ListeningWithCategory } from "@/types/database.types";

export function ListeningsTable() {
  const router = useRouter();
  const [showDeleted, setShowDeleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingListening, setEditingListening] = useState<Listening | null>(
    null
  );
  const [deleteListening, setDeleteListening] =
    useState<ListeningWithCategory | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const { data, isLoading } = useListenings({ showDeleted });
  const softDelete = useSoftDeleteListening();
  const restore = useRestoreListening();

  const handleView = useCallback(
    (listening: ListeningWithCategory) =>
      router.push(`/listening/${listening.id}`),
    [router]
  );

  const handleEdit = useCallback((listening: ListeningWithCategory) => {
    setEditingListening(listening);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((listening: ListeningWithCategory) => {
    setDeleteListening(listening);
  }, []);

  const handleRestore = useCallback(
    (listening: ListeningWithCategory) => {
      restore.mutate(listening.id);
    },
    [restore]
  );

  const columns = useMemo(
    () =>
      getListeningsColumns({
        onView: handleView,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onRestore: handleRestore,
      }),
    [handleView, handleEdit, handleDelete, handleRestore]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Listening" description="Manage listening content">
        <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Categories
        </Button>
        <Button
          onClick={() => {
            setEditingListening(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Listening
        </Button>
      </PageHeader>

      <StatsCards
        stats={[
          {
            label: "Total",
            value: data?.count ?? 0,
            icon: Headphones,
          },
          {
            label: "Active",
            value: data?.data?.filter((l) => !l.is_deleted).length ?? 0,
            icon: CheckCircle,
          },
          {
            label: "Deleted",
            value: data?.data?.filter((l) => l.is_deleted).length ?? 0,
            icon: Trash2,
          },
        ]}
      />

      <div className="flex items-center gap-2">
        <Switch
          id="show-deleted-listenings"
          checked={showDeleted}
          onCheckedChange={setShowDeleted}
        />
        <Label htmlFor="show-deleted-listenings">Show deleted</Label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={handleView}
        emptyTitle="No listenings"
        emptyMessage="Create your first listening content to get started."
      />

      <ListeningFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        listening={editingListening}
      />

      <DeleteConfirmDialog
        open={!!deleteListening}
        onOpenChange={(open) => !open && setDeleteListening(null)}
        title={`Delete "${deleteListening?.title}"?`}
        onConfirm={() => {
          if (deleteListening) {
            softDelete.mutate(deleteListening.id);
            setDeleteListening(null);
          }
        }}
        isLoading={softDelete.isPending}
      />

      <ListeningCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />
    </div>
  );
}

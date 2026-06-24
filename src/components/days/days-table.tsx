"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDays, useSoftDeleteDay, useRestoreDay } from "@/lib/queries/days";
import { getDaysColumns } from "@/components/days/days-table-columns";
import { DayFormDialog } from "@/components/days/day-form-dialog";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatsCards } from "@/components/shared/stats-cards";
import { CalendarDays, CheckCircle, Plus, Trash2 } from "lucide-react";
import type { Day } from "@/types/database.types";

export function DaysTable() {
  const router = useRouter();
  const [showDeleted, setShowDeleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<Day | null>(null);
  const [deleteDay, setDeleteDay] = useState<Day | null>(null);

  const { data, isLoading } = useDays({ showDeleted });
  const softDelete = useSoftDeleteDay();
  const restore = useRestoreDay();

  const handleView = useCallback(
    (day: Day) => router.push(`/days/${day.id}`),
    [router]
  );

  const handleEdit = useCallback((day: Day) => {
    setEditingDay(day);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((day: Day) => {
    setDeleteDay(day);
  }, []);

  const handleRestore = useCallback(
    (day: Day) => {
      restore.mutate(day.id);
    },
    [restore]
  );

  const columns = useMemo(
    () =>
      getDaysColumns({
        onView: handleView,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onRestore: handleRestore,
      }),
    [handleView, handleEdit, handleDelete, handleRestore]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Days" description="Manage daily content structure">
        <Button
          onClick={() => {
            setEditingDay(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Day
        </Button>
      </PageHeader>

      <StatsCards
        stats={[
          {
            label: "Total Days",
            value: data?.count ?? 0,
            icon: CalendarDays,
          },
          {
            label: "Active",
            value: data?.data?.filter((d) => !d.is_deleted).length ?? 0,
            icon: CheckCircle,
          },
          {
            label: "Deleted",
            value: data?.data?.filter((d) => d.is_deleted).length ?? 0,
            icon: Trash2,
          },
        ]}
      />

      <div className="flex items-center gap-2">
        <Switch
          id="show-deleted"
          checked={showDeleted}
          onCheckedChange={setShowDeleted}
        />
        <Label htmlFor="show-deleted">Show deleted</Label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={handleView}
        emptyMessage="No days found. Create your first day to get started."
      />

      <DayFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        day={editingDay}
      />

      <DeleteConfirmDialog
        open={!!deleteDay}
        onOpenChange={(open) => !open && setDeleteDay(null)}
        title={`Delete Day ${deleteDay?.order_number}?`}
        onConfirm={() => {
          if (deleteDay) {
            softDelete.mutate(deleteDay.id);
            setDeleteDay(null);
          }
        }}
        isLoading={softDelete.isPending}
      />
    </div>
  );
}

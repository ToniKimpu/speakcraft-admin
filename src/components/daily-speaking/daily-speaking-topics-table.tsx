"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useDailySpeakingTopics,
  useSoftDeleteDailySpeakingTopic,
  useRestoreDailySpeakingTopic,
} from "@/lib/queries/daily-speaking-topics";
import { getDailySpeakingTopicsColumns } from "@/components/daily-speaking/daily-speaking-topics-table-columns";
import { DailySpeakingTopicFormSheet } from "@/components/daily-speaking/daily-speaking-topic-form-sheet";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCards } from "@/components/shared/stats-cards";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, MessagesSquare, Plus, Trash2 } from "lucide-react";
import type { DailySpeakingTopic } from "@/types/database.types";

export function DailySpeakingTopicsTable() {
  const [showDeleted, setShowDeleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<DailySpeakingTopic | null>(
    null
  );
  const [deleteTopic, setDeleteTopic] = useState<DailySpeakingTopic | null>(
    null
  );

  const { data, isLoading } = useDailySpeakingTopics({ showDeleted });
  const softDelete = useSoftDeleteDailySpeakingTopic();
  const restore = useRestoreDailySpeakingTopic();

  const handleEdit = useCallback((topic: DailySpeakingTopic) => {
    setEditingTopic(topic);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((topic: DailySpeakingTopic) => {
    setDeleteTopic(topic);
  }, []);

  const handleRestore = useCallback(
    (topic: DailySpeakingTopic) => {
      restore.mutate(topic.id);
    },
    [restore]
  );

  const columns = useMemo(
    () =>
      getDailySpeakingTopicsColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onRestore: handleRestore,
      }),
    [handleEdit, handleDelete, handleRestore]
  );

  const published = data?.data?.filter((t) => t.is_published).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Speaking"
        description="Manage suggested speaking topics"
      >
        <Button
          onClick={() => {
            setEditingTopic(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Topic
        </Button>
      </PageHeader>

      <StatsCards
        stats={[
          {
            label: "Total",
            value: data?.count ?? 0,
            icon: MessagesSquare,
          },
          {
            label: "Published",
            value: published,
            icon: CheckCircle,
          },
          {
            label: "Deleted",
            value: data?.data?.filter((t) => t.is_deleted).length ?? 0,
            icon: Trash2,
          },
        ]}
      />

      <div className="flex items-center gap-2">
        <Switch
          id="show-deleted-topics"
          checked={showDeleted}
          onCheckedChange={setShowDeleted}
        />
        <Label htmlFor="show-deleted-topics">Show deleted</Label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={handleEdit}
        emptyTitle="No topics"
        emptyMessage="Create your first speaking topic to get started."
      />

      <DailySpeakingTopicFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        topic={editingTopic}
      />

      <DeleteConfirmDialog
        open={!!deleteTopic}
        onOpenChange={(open) => !open && setDeleteTopic(null)}
        title={`Delete "${deleteTopic?.title}"?`}
        onConfirm={() => {
          if (deleteTopic) {
            softDelete.mutate(deleteTopic.id);
            setDeleteTopic(null);
          }
        }}
        isLoading={softDelete.isPending}
      />
    </div>
  );
}

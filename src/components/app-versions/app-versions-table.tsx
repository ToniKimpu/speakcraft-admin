"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useAppVersions,
  useSoftDeleteAppVersion,
  useRestoreAppVersion,
} from "@/lib/queries/app-versions";
import { getAppVersionsColumns } from "@/components/app-versions/app-versions-table-columns";
import { AppVersionFormSheet } from "@/components/app-versions/app-version-form-sheet";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCards } from "@/components/shared/stats-cards";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Smartphone, Trash2, ArrowUpCircle, Info } from "lucide-react";
import type { AppVersion } from "@/types/database.types";

export function AppVersionsTable() {
  const [showDeleted, setShowDeleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppVersion | null>(null);
  const [toDelete, setToDelete] = useState<AppVersion | null>(null);

  const { data, isLoading } = useAppVersions({ showDeleted });
  const softDelete = useSoftDeleteAppVersion();
  const restore = useRestoreAppVersion();

  // The app reads the highest build among non-deleted rows.
  const live = useMemo(() => {
    const active = (data?.data ?? []).filter((v) => !v.is_deleted);
    return active.length
      ? active.reduce((a, b) => (b.build_number > a.build_number ? b : a))
      : null;
  }, [data]);

  const handleEdit = useCallback((v: AppVersion) => {
    setEditing(v);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((v: AppVersion) => {
    setToDelete(v);
  }, []);

  const handleRestore = useCallback(
    (v: AppVersion) => {
      restore.mutate(v.id);
    },
    [restore]
  );

  const columns = useMemo(
    () =>
      getAppVersionsColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onRestore: handleRestore,
        currentId: live?.id ?? null,
      }),
    [handleEdit, handleDelete, handleRestore, live]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Versions"
        description="Force-update / new-version gate read by the mobile app"
      >
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Version
        </Button>
      </PageHeader>

      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Release checklist</p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  Build &amp; upload the APK with{" "}
                  <code className="rounded bg-muted px-1">--build-number N</code>{" "}
                  matching the row you&apos;ll add.
                </li>
                <li>
                  Only <strong>after</strong> the download URL is live,{" "}
                  <strong>add a new row</strong> with that build number — don&apos;t
                  edit the live row.
                </li>
                <li>
                  The app shows the row with the{" "}
                  <strong>highest build number</strong>; users on a lower build
                  get the update screen.
                </li>
                <li>
                  Turn on <strong>Force update</strong> to hide the
                  &ldquo;Skip&rdquo; button.
                </li>
                <li>
                  To roll back, <strong>delete</strong> the bad build — the app
                  falls back to the previous highest.
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <StatsCards
        stats={[
          { label: "Total", value: data?.count ?? 0, icon: Smartphone },
          {
            label: "Live build",
            value: live ? `#${live.build_number}` : "—",
            icon: ArrowUpCircle,
          },
          {
            label: "Deleted",
            value: data?.data?.filter((v) => v.is_deleted).length ?? 0,
            icon: Trash2,
          },
        ]}
      />

      <div className="flex items-center gap-2">
        <Switch
          id="show-deleted-versions"
          checked={showDeleted}
          onCheckedChange={setShowDeleted}
        />
        <Label htmlFor="show-deleted-versions">Show deleted</Label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={handleEdit}
        emptyTitle="No versions"
        emptyMessage="Add your first app version to enable the update gate."
      />

      <AppVersionFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        version={editing}
        suggestedBuild={(live?.build_number ?? 0) + 1}
      />

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete build #${toDelete?.build_number} (${toDelete?.version_name})?`}
        description="Soft-delete — the app stops seeing it. You can restore it later."
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

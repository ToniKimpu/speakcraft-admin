"use client";

import { useState, useMemo, useCallback } from "react";
import {
  usePaymentMethods,
  useDeletePaymentMethod,
} from "@/lib/queries/payment-methods";
import { getPaymentMethodsColumns } from "@/components/payments/payment-methods-table-columns";
import { PaymentMethodFormSheet } from "@/components/payments/payment-method-form-sheet";
import { DataTable } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { PaymentMethod } from "@/types/database.types";

export function PaymentMethodsTable() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState<PaymentMethod | null>(null);

  const { data, isLoading } = usePaymentMethods();
  const del = useDeletePaymentMethod();

  const handleEdit = useCallback((method: PaymentMethod) => {
    setEditing(method);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((method: PaymentMethod) => {
    setDeleting(method);
  }, []);

  const columns = useMemo(
    () =>
      getPaymentMethodsColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
      }),
    [handleEdit, handleDelete]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Method
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={handleEdit}
        emptyTitle="No payment methods"
        emptyMessage="Add a KPay number, bank account, or other destination users pay to."
      />

      <PaymentMethodFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        method={editing}
      />

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.display_name}"?`}
        description="This permanently removes the payment method. Existing submissions keep their snapshotted details."
        onConfirm={() => {
          if (deleting) {
            del.mutate(deleting.id);
            setDeleting(null);
          }
        }}
        isLoading={del.isPending}
      />
    </div>
  );
}

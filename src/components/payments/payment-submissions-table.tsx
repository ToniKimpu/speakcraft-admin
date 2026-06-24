"use client";

import { useState, useMemo, useCallback } from "react";
import { usePaymentSubmissions } from "@/lib/queries/payment-submissions";
import { getPaymentSubmissionsColumns } from "@/components/payments/payment-submissions-table-columns";
import { PaymentSubmissionDetailDialog } from "@/components/payments/payment-submission-detail-dialog";
import { DataTable } from "@/components/shared/data-table";
import { StatsCards } from "@/components/shared/stats-cards";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import type {
  PaymentSubmissionStatus,
  PaymentSubmissionWithUser,
} from "@/types/database.types";

export function PaymentSubmissionsTable() {
  const [status, setStatus] = useState<PaymentSubmissionStatus>("pending");
  const [reviewing, setReviewing] =
    useState<PaymentSubmissionWithUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = usePaymentSubmissions({ status });

  const handleReview = useCallback((submission: PaymentSubmissionWithUser) => {
    setReviewing(submission);
    setDetailOpen(true);
  }, []);

  const columns = useMemo(
    () => getPaymentSubmissionsColumns({ onReview: handleReview }),
    [handleReview]
  );

  return (
    <div className="space-y-4">
      <StatsCards
        stats={[
          { label: `${status} submissions`, value: data?.count ?? 0, icon:
            status === "pending"
              ? Clock
              : status === "approved"
                ? CheckCircle
                : XCircle },
        ]}
      />

      <Tabs
        value={status}
        onValueChange={(v) => setStatus(v as PaymentSubmissionStatus)}
      >
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-4">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            onRowClick={handleReview}
            emptyTitle={`No ${status} submissions`}
            emptyMessage="Payment screenshots awaiting your review will appear here."
          />
        </TabsContent>
      </Tabs>

      <PaymentSubmissionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        submission={reviewing}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { getPaymentProofUrl } from "@/lib/actions/payment-submissions";
import {
  useApprovePaymentSubmission,
  useRejectPaymentSubmission,
  useRevokePaymentSubmission,
} from "@/lib/queries/payment-submissions";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type {
  PaymentSubmissionStatus,
  PaymentSubmissionWithUser,
} from "@/types/database.types";

const STATUS_VARIANT: Record<
  PaymentSubmissionStatus,
  "warning" | "success" | "destructive"
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: PaymentSubmissionWithUser | null;
}

export function PaymentSubmissionDetailDialog({
  open,
  onOpenChange,
  submission,
}: Props) {
  const [reason, setReason] = useState("");

  const approve = useApprovePaymentSubmission();
  const reject = useRejectPaymentSubmission();
  const revoke = useRevokePaymentSubmission();
  const isBusy = approve.isPending || reject.isPending || revoke.isPending;

  const { data: proofUrl, isLoading: loadingProof } = useQuery({
    queryKey: ["paymentProof", submission?.id],
    queryFn: () => getPaymentProofUrl(submission!.proof_path),
    enabled: open && !!submission?.proof_path,
    staleTime: 5 * 60 * 1000,
  });

  function handleOpenChange(next: boolean) {
    if (!next) setReason("");
    onOpenChange(next);
  }

  if (!submission) return null;

  const isPending = submission.status === "pending";
  const isApproved = submission.status === "approved";

  async function handleApprove() {
    await approve.mutateAsync(submission!.id);
    handleOpenChange(false);
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error("Enter a reason — the user sees it as the rejection message.");
      return;
    }
    await reject.mutateAsync({
      submissionId: submission!.id,
      reason: reason.trim(),
    });
    handleOpenChange(false);
  }

  async function handleRevoke() {
    if (!reason.trim()) {
      toast.error("Enter a reason — the user sees it as the revoke message.");
      return;
    }
    await revoke.mutateAsync({
      submissionId: submission!.id,
      reason: reason.trim(),
    });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Payment #{submission.id}
            <Badge variant={STATUS_VARIANT[submission.status]}>
              {submission.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {submission.users?.name || submission.users?.email || "Unknown user"}
            {submission.users?.account_id
              ? ` · ${submission.users.account_id}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Amount</span>
            <p className="font-medium">
              {submission.amount.toLocaleString()} {submission.currency}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Method</span>
            <p className="font-medium">{submission.method_label}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Plan</span>
            <p className="font-medium">{submission.plan_code}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Submitted</span>
            <p className="font-medium">{fmtDate(submission.created_at)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Current premium until</span>
            <p className="font-medium">
              {fmtDate(submission.users?.premium_until ?? null)}
            </p>
          </div>
          {submission.reviewed_at && (
            <div>
              <span className="text-muted-foreground">Reviewed</span>
              <p className="font-medium">{fmtDate(submission.reviewed_at)}</p>
            </div>
          )}
        </div>

        {submission.status === "rejected" && submission.reject_reason && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Rejected: {submission.reject_reason}
          </p>
        )}

        <Separator />

        <div className="space-y-2">
          <Label>Receipt screenshot</Label>
          {loadingProof ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : proofUrl ? (
            <a href={proofUrl} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofUrl}
                alt="Payment receipt"
                className="max-h-80 w-auto rounded-lg border"
              />
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" /> Open full size
              </span>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">No screenshot.</p>
          )}
        </div>

        {isPending && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reject-reason">
                  Rejection reason (sent to the user)
                </Label>
                <Textarea
                  id="reject-reason"
                  rows={2}
                  placeholder="e.g. Screenshot is unclear — please resend a clearer receipt."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isBusy}
                  className="text-destructive"
                >
                  {reject.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={isBusy}>
                  {approve.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Approve &amp; grant premium
                </Button>
              </div>
            </div>
          </>
        )}

        {isApproved && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Revoking ends this user&apos;s premium immediately, refunds the
                subscription, and notifies them. Use for refunds or fake proof
                caught after approval.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="revoke-reason">
                  Revoke reason (sent to the user)
                </Label>
                <Textarea
                  id="revoke-reason"
                  rows={2}
                  placeholder="e.g. Payment reversed / proof could not be verified."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleRevoke}
                  disabled={isBusy}
                  className="text-destructive"
                >
                  {revoke.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Revoke premium
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

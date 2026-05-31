"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  rejectRepaymentProof,
  verifyRepaymentProof,
} from "@/app/lender/actions";
import type { RepaymentProofStatus } from "@/lib/supabase/types";
import { canReviewRepaymentProof } from "@/lib/workflow-rules";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";

type LenderRepaymentProofActionsProps = {
  proofId: string;
  proofStatus: RepaymentProofStatus;
  proofUrl: string | null;
  proofFileName: string;
  proofFileSize: number;
  proofFileType: string;
};

export function LenderRepaymentProofActions({
  proofId,
  proofStatus,
  proofUrl,
  proofFileName,
  proofFileSize,
  proofFileType,
}: LenderRepaymentProofActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const [reviewedStatus, setReviewedStatus] =
    useState<RepaymentProofStatus | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const canReview = canReviewRepaymentProof(reviewedStatus ?? proofStatus);

  function onVerify() {
    if (!canReview) {
      return;
    }

    setMessage("Verifying repayment...");
    setTone("success");

    startTransition(async () => {
      const result = await verifyRepaymentProof(proofId);

      setMessage(result.message);
      setTone(result.ok ? "success" : "error");
      if (result.ok) {
        setReviewedStatus("verified");
        router.refresh();
      }
    });
  }

  function onReject() {
    if (!canReview) {
      return;
    }

    setMessage("Rejecting proof...");
    setTone("success");

    startTransition(async () => {
      const result = await rejectRepaymentProof(proofId, note);

      setMessage(result.message);
      setTone(result.ok ? "success" : "error");
      if (result.ok) {
        setNote("");
        setReviewedStatus("rejected");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3 border-t border-border pt-3">
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        {proofUrl ? (
          <Button
            variant="outline"
            className="h-10 rounded-full font-semibold"
            onClick={() => setPreviewOpen(true)}
          >
            Preview proof
          </Button>
        ) : null}
        <Button
          onClick={onVerify}
          disabled={isPending || !canReview}
          className="h-10 rounded-full font-semibold"
        >
          {reviewedStatus === "verified" ? "Verified" : "Verify repayment"}
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`reject-note-${proofId}`} className="text-sm font-semibold">
          Rejection note
        </Label>
        <Textarea
          id={`reject-note-${proofId}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={280}
          disabled={isPending || !canReview}
          placeholder="Tell the borrower what to correct."
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Rejection notes are shown to the borrower with the corrected upload step.
        </p>
        <Button
          variant="outline"
          onClick={onReject}
          disabled={isPending || !canReview}
          className="h-10 w-full rounded-full font-semibold text-destructive hover:text-destructive sm:w-fit"
        >
          {reviewedStatus === "rejected" ? "Rejected" : "Reject proof"}
        </Button>
      </div>

      {!canReview && !message ? (
        <p
          className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm leading-6 text-foreground"
          role="status"
        >
          This proof has already been reviewed.
        </p>
      ) : null}

      {message ? (
        <p
          className={cn(
            "rounded-xl border px-3 py-2 text-sm leading-6",
            tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <DocumentPreviewDialog
        title="Repayment Proof Preview"
        fileName={proofFileName}
        fileSize={proofFileSize}
        fileType={proofFileType}
        viewUrl={proofUrl}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

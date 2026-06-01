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
import { Loader2 } from "lucide-react";
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
  const [showRejectForm, setShowRejectForm] = useState(false);
  const canReview = canReviewRepaymentProof(reviewedStatus ?? proofStatus);

  function onVerify() {
    if (!canReview) {
      return;
    }

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
        setShowRejectForm(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={onVerify}
          disabled={isPending || !canReview}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : reviewedStatus === "verified" ? (
            "Verified"
          ) : (
            "Verify repayment"
          )}
        </Button>
        {proofUrl ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewOpen(true)}
          >
            Preview proof
          </Button>
        ) : null}
        {!showRejectForm && canReview ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setShowRejectForm(true)}
            disabled={isPending}
          >
            Reject
          </Button>
        ) : null}
      </div>

      {showRejectForm ? (
        <div className="grid gap-1.5">
          <Textarea
            id={`reject-note-${proofId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={280}
            disabled={isPending || !canReview}
            placeholder="Reason for rejection (optional)"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowRejectForm(false);
                setNote("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onReject}
              disabled={isPending || !canReview}
            >
              {reviewedStatus === "rejected" ? "Rejected" : "Confirm rejection"}
            </Button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          className={cn(
            "text-xs",
            tone === "error" ? "text-destructive" : "text-emerald-700",
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

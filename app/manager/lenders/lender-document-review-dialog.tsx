"use client";

import { useRef, useState } from "react";
import { reviewLenderVerificationDocumentAction } from "@/app/manager/actions";
import { getCurrentScrollY } from "@/app/manager/scroll-position";
import { lenderVerificationDocumentTypeLabels } from "@/lib/lender-verification";
import type { LenderVerificationDocumentType } from "@/lib/lender-verification";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";
import type { DocumentAiReviewStatus } from "@/lib/ai/document-review";
import {
  CheckCircle2Icon,
  Eye,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";

export function LenderDocumentActionsCell({
  documentId,
  documentType,
  fileName,
  fileSize,
  fileType,
  viewUrl,
  canReview,
  aiReviewStatus,
  selected,
}: {
  documentId: string;
  documentType: LenderVerificationDocumentType;
  fileName: string;
  fileSize: number;
  fileType: string;
  viewUrl: string | null;
  canReview: boolean;
  aiReviewStatus: DocumentAiReviewStatus;
  selected?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"reject" | "replace">("reject");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const acceptFormRef = useRef<HTMLFormElement>(null);
  const acceptScrollYRef = useRef<HTMLInputElement>(null);
  const rejectScrollYRef = useRef<HTMLInputElement>(null);
  const documentLabel = lenderVerificationDocumentTypeLabels[documentType];
  const acceptRequiresPreview = aiReviewStatus === "fail" && !hasPreviewed;

  function handleAccept() {
    if (acceptRequiresPreview) return;
    if (acceptScrollYRef.current) {
      acceptScrollYRef.current.value = getCurrentScrollY();
    }
    acceptFormRef.current?.requestSubmit();
  }

  function openPreview() {
    setHasPreviewed(true);
    setPreviewOpen(true);
  }

  function openDecisionDialog(mode: "reject" | "replace") {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
        {viewUrl ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={openPreview}
          >
            <Eye className="size-3.5" />
            Preview
          </Button>
        ) : null}
        {canReview ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      disabled={acceptRequiresPreview}
                      onClick={handleAccept}
                    >
                      <CheckCircle2Icon className="size-3.5" />
                      Accept
                    </Button>
                  </span>
                </TooltipTrigger>
                {acceptRequiresPreview ? (
                  <TooltipContent>
                    Preview the flagged document before accepting it.
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={() => openDecisionDialog("reject")}
            >
              <XCircleIcon className="size-3.5" />
              Reject
            </Button>
            {aiReviewStatus === "fail" ||
            aiReviewStatus === "needs_manual_review" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => openDecisionDialog("replace")}
              >
                <RotateCcwIcon className="size-3.5" />
                Request replacement
              </Button>
            ) : null}
          </>
        ) : null}
      </div>

      <form
        ref={acceptFormRef}
        action={reviewLenderVerificationDocumentAction}
        className="hidden"
      >
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="accept" />
        <input type="hidden" name="reviewNotes" value="" />
        <input ref={acceptScrollYRef} type="hidden" name="scrollY" />
        {selected ? (
          <input type="hidden" name="selected" value={selected} />
        ) : null}
      </form>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "replace"
                ? "Request replacement"
                : "Reject document"}
            </DialogTitle>
            <DialogDescription>{documentLabel}</DialogDescription>
          </DialogHeader>

          <form
            action={reviewLenderVerificationDocumentAction}
            className="grid gap-3"
            onSubmit={() => {
              if (rejectScrollYRef.current) {
                rejectScrollYRef.current.value = getCurrentScrollY();
              }
              setDialogOpen(false);
            }}
          >
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="decision" value="reject" />
            <input ref={rejectScrollYRef} type="hidden" name="scrollY" />
            {dialogMode === "replace" ? (
              <input
                type="hidden"
                name="reviewNotes"
                value="Replacement requested for this required document."
              />
            ) : null}
            {selected ? (
              <input type="hidden" name="selected" value={selected} />
            ) : null}

            {dialogMode === "reject" ? (
              <div className="grid gap-1.5">
                <Label
                  htmlFor={`review-note-${documentId}`}
                  className="text-xs font-medium"
                >
                  Note (recommended)
                </Label>
                <Textarea
                  id={`review-note-${documentId}`}
                  name="reviewNotes"
                  rows={3}
                  maxLength={1000}
                  placeholder="Explain why this document is being rejected..."
                />
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={dialogMode === "replace" ? "outline" : "destructive"}
              >
                {dialogMode === "replace" ? "Request replacement" : "Reject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        title={`${documentLabel} Preview`}
        fileName={fileName}
        fileSize={fileSize}
        fileType={fileType}
        viewUrl={viewUrl}
        open={previewOpen}
        onOpenChange={(open) => {
          if (open) setHasPreviewed(true);
          setPreviewOpen(open);
        }}
      />
    </>
  );
}

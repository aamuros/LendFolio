"use client";

import { useState } from "react";
import { FileTextIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";
import { DocumentAiReviewNote } from "@/components/document-ai-review-note";
import {
  lenderVerificationDocumentTypeLabels,
  type LenderVerificationDocumentType,
} from "@/lib/lender-verification";
import type { DocumentAiReviewSummary } from "@/lib/ai/document-review";
import { formatDateTime } from "../manager-ui";

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function LenderEvidenceDocumentRow({
  fileName,
  fileSize,
  fileType,
  documentType,
  uploadedAt,
  reviewNotes,
  viewUrl,
  aiReview,
  statusBadge,
}: {
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: LenderVerificationDocumentType;
  uploadedAt: string;
  reviewNotes: string | null;
  viewUrl: string | null;
  aiReview: DocumentAiReviewSummary;
  statusBadge: React.ReactNode;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const documentLabel = lenderVerificationDocumentTypeLabels[documentType];

  return (
    <>
      <div className="flex items-start gap-3 rounded-md border border-border/50 px-3 py-2 sm:items-center">
        <FileTextIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground sm:mt-0" />
        <div className="min-w-0 flex-1">
          {viewUrl ? (
            <button
              type="button"
              className="truncate text-xs font-medium text-left hover:underline"
              onClick={() => setPreviewOpen(true)}
            >
              {fileName}
            </button>
          ) : (
            <p className="truncate text-xs font-medium">{fileName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {documentLabel}
            {" \u00b7 "}
            {formatFileSize(fileSize)}
            {" \u00b7 "}
            {formatDateTime(uploadedAt)}
          </p>
          {reviewNotes ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Note: {reviewNotes}
            </p>
          ) : null}
          <DocumentAiReviewNote review={aiReview} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusBadge}
          {viewUrl ? (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-3.5" />
              Preview
            </Button>
          ) : null}
        </div>
      </div>

      <DocumentPreviewDialog
        title={`${documentLabel} Preview`}
        fileName={fileName}
        fileSize={fileSize}
        fileType={fileType}
        viewUrl={viewUrl}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}

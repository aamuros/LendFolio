"use client";

import { useRef, useState } from "react";
import { reviewLenderVerificationDocumentAction } from "@/app/manager/actions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";
import {
  CheckCircle2Icon,
  Eye,
  MoreHorizontalIcon,
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
  selected,
}: {
  documentId: string;
  documentType: LenderVerificationDocumentType;
  fileName: string;
  fileSize: number;
  fileType: string;
  viewUrl: string | null;
  canReview: boolean;
  selected?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const acceptFormRef = useRef<HTMLFormElement>(null);
  const documentLabel = lenderVerificationDocumentTypeLabels[documentType];

  function handleAccept() {
    acceptFormRef.current?.requestSubmit();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="ml-auto">
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {viewUrl ? (
            <DropdownMenuItem onSelect={() => setPreviewOpen(true)}>
              <Eye className="size-3.5" />
              Preview
            </DropdownMenuItem>
          ) : null}
          {canReview ? (
            <>
              {viewUrl ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onSelect={handleAccept}>
                <CheckCircle2Icon className="size-3.5" />
                Accept
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <XCircleIcon className="size-3.5" />
                Reject
              </DropdownMenuItem>
            </>
          ) : null}
          {!viewUrl && !canReview ? (
            <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <form
        ref={acceptFormRef}
        action={reviewLenderVerificationDocumentAction}
        className="hidden"
      >
        <input type="hidden" name="documentId" value={documentId} />
        <input type="hidden" name="decision" value="accept" />
        <input type="hidden" name="reviewNotes" value="" />
        {selected ? (
          <input type="hidden" name="selected" value={selected} />
        ) : null}
      </form>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>{documentLabel}</DialogDescription>
          </DialogHeader>

          <form
            action={reviewLenderVerificationDocumentAction}
            className="grid gap-3"
            onSubmit={() => setDialogOpen(false)}
          >
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="decision" value="reject" />
            {selected ? (
              <input type="hidden" name="selected" value={selected} />
            ) : null}

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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Reject
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
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}

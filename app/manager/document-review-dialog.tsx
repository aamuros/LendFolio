"use client";

import { useRef, useState } from "react";
import { reviewBorrowerVerificationDocumentAction } from "@/app/manager/actions";
import { getCurrentScrollY } from "@/app/manager/scroll-position";
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

export function DocumentActionsCell({
  documentId,
  documentLabel,
  fileName,
  fileSize,
  fileType,
  viewUrl,
  canReview,
  selected,
}: {
  documentId: string;
  documentLabel: string;
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
  const acceptScrollYRef = useRef<HTMLInputElement>(null);
  const rejectScrollYRef = useRef<HTMLInputElement>(null);

  function handleAccept() {
    if (acceptScrollYRef.current) {
      acceptScrollYRef.current.value = getCurrentScrollY();
    }
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
        action={reviewBorrowerVerificationDocumentAction}
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
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>{documentLabel}</DialogDescription>
          </DialogHeader>

          <form
            action={reviewBorrowerVerificationDocumentAction}
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

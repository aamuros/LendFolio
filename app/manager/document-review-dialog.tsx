"use client";

import { useState } from "react";
import { reviewBorrowerVerificationDocumentAction } from "@/app/manager/actions";
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
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  XCircleIcon,
} from "lucide-react";

type DocumentReviewDecision = "accept" | "reject";

export function DocumentActionsCell({
  documentId,
  documentLabel,
  viewUrl,
  canReview,
  selected,
}: {
  documentId: string;
  documentLabel: string;
  viewUrl: string | null;
  canReview: boolean;
  selected?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [decision, setDecision] = useState<DocumentReviewDecision | null>(null);

  function handleReviewAction(decision: DocumentReviewDecision) {
    setDecision(decision);
    setDialogOpen(true);
  }

  const isReject = decision === "reject";

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
            <DropdownMenuItem asChild>
              <a href={viewUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon className="size-3.5" />
                View
              </a>
            </DropdownMenuItem>
          ) : null}
          {canReview ? (
            <>
              {viewUrl ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onSelect={() => handleReviewAction("accept")}>
                <CheckCircle2Icon className="size-3.5" />
                Accept
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleReviewAction("reject")}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isReject ? "Reject document" : "Accept document"}
            </DialogTitle>
            <DialogDescription>{documentLabel}</DialogDescription>
          </DialogHeader>

          <form
            action={reviewBorrowerVerificationDocumentAction}
            className="grid gap-3"
            onSubmit={() => setDialogOpen(false)}
          >
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="decision" value={decision ?? ""} />
            {selected ? (
              <input type="hidden" name="selected" value={selected} />
            ) : null}

            <div className="grid gap-1.5">
              <Label
                htmlFor={`review-note-${documentId}`}
                className="text-xs font-medium"
              >
                Note {isReject ? "(recommended)" : "(optional)"}
              </Label>
              <Textarea
                id={`review-note-${documentId}`}
                name="reviewNotes"
                rows={3}
                maxLength={1000}
                placeholder={
                  isReject
                    ? "Explain why this document is being rejected..."
                    : "Add an optional note..."
                }
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
              <Button
                type="submit"
                variant={isReject ? "destructive" : "default"}
              >
                {isReject ? "Reject" : "Accept"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

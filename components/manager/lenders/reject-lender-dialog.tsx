"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { XCircleIcon } from "lucide-react";
import { reviewLenderAction } from "@/app/manager/actions";

export function RejectLenderDialog({
  lenderId,
  organizationName,
  returnPath,
}: {
  lenderId: string;
  organizationName: string;
  returnPath: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <XCircleIcon className="size-4" />
          Reject lender
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject lender?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reject {organizationName}&apos;s lender application.
            Provide a reason below so the applicant understands the decision.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={reviewLenderAction} id={`reject-form-${lenderId}`}>
          <input type="hidden" name="lenderProfileId" value={lenderId} />
          <input type="hidden" name="decision" value="reject" />
          <input type="hidden" name="returnPath" value={returnPath} />
          <div className="grid gap-1.5">
            <Label
              htmlFor={`reason-${lenderId}`}
              className="text-xs font-medium"
            >
              Rejection reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`reason-${lenderId}`}
              name="rejectionReason"
              rows={3}
              required
              maxLength={1000}
              placeholder="Provide a reason for rejecting this lender..."
            />
          </div>
          <div className="mt-3 grid gap-1.5">
            <Label
              htmlFor={`notes-reject-${lenderId}`}
              className="text-xs font-medium"
            >
              Review notes
            </Label>
            <Textarea
              id={`notes-reject-${lenderId}`}
              name="managerReviewNotes"
              rows={2}
              maxLength={1000}
              placeholder="Optional internal note..."
            />
          </div>
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            type="submit"
            form={`reject-form-${lenderId}`}
          >
            Confirm rejection
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

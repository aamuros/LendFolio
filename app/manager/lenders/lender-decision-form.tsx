"use client";

import { useState } from "react";
import { reviewLenderAction } from "@/app/manager/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2Icon, ShieldAlertIcon, XCircleIcon } from "lucide-react";

export function LenderDecisionForm({
  lenderId,
  selected,
  disclosuresCurrent,
}: {
  lenderId: string;
  selected?: string;
  disclosuresCurrent: boolean;
}) {
  const [rejectionReason, setRejectionReason] = useState("");

  if (!disclosuresCurrent) {
    return (
      <div className="grid gap-3">
        <form action={reviewLenderAction} className="grid gap-3">
          <input type="hidden" name="lenderProfileId" value={lenderId} />
          {selected ? <input type="hidden" name="selected" value={selected} /> : null}
          <div className="grid gap-1.5">
            <Label
              htmlFor={`notes-${lenderId}`}
              className="text-xs font-medium"
            >
              Manager note
            </Label>
            <Textarea
              id={`notes-${lenderId}`}
              name="managerReviewNotes"
              rows={2}
              maxLength={1000}
              placeholder="Add a note for this review..."
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor={`reason-blocked-${lenderId}`}
              className="text-xs font-medium"
            >
              Rejection reason
            </Label>
            <Textarea
              id={`reason-blocked-${lenderId}`}
              name="rejectionReason"
              rows={2}
              maxLength={1000}
              placeholder="Required when rejecting..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            name="decision"
            value="reject"
            variant="destructive"
            className="w-full"
            disabled={rejectionReason.trim().length === 0}
          >
            <XCircleIcon className="size-4" />
            Reject
          </Button>
        </form>
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertDescription>
            Approval blocked until required disclosures are accepted.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <form action={reviewLenderAction} className="grid gap-3">
      <input type="hidden" name="lenderProfileId" value={lenderId} />
      {selected ? <input type="hidden" name="selected" value={selected} /> : null}
      <div className="grid gap-1.5">
        <Label
          htmlFor={`notes-${lenderId}`}
          className="text-xs font-medium"
        >
          Manager note
        </Label>
        <Textarea
          id={`notes-${lenderId}`}
          name="managerReviewNotes"
          rows={2}
          maxLength={1000}
          placeholder="Add a note for this review..."
        />
      </div>
      <div className="grid gap-1.5">
        <Label
          htmlFor={`reason-${lenderId}`}
          className="text-xs font-medium"
        >
          Rejection reason
        </Label>
        <Textarea
          id={`reason-${lenderId}`}
          name="rejectionReason"
          rows={2}
          maxLength={1000}
          placeholder="Required when rejecting..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Button
          type="submit"
          name="decision"
          value="approve"
          className="w-full"
        >
          <CheckCircle2Icon className="size-4" />
          Approve
        </Button>
        <Button
          type="submit"
          name="decision"
          value="reject"
          variant="destructive"
          className="w-full"
          disabled={rejectionReason.trim().length === 0}
        >
          <XCircleIcon className="size-4" />
          Reject
        </Button>
        <Button
          type="submit"
          name="decision"
          value="return_to_pending"
          variant="ghost"
          className="w-full"
        >
          Return to pending
        </Button>
      </div>
    </form>
  );
}

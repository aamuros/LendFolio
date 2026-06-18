"use client";

import { useRef, useState } from "react";
import { reviewBorrowerVerificationAction } from "@/app/manager/actions";
import { getCurrentScrollY } from "@/app/manager/scroll-position";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

export function VerificationDecisionForm({
  borrowerId,
  verificationId,
  selected,
}: {
  borrowerId: string;
  verificationId: string;
  selected?: string;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const scrollYRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={reviewBorrowerVerificationAction}
      className="grid gap-3"
      onSubmit={() => {
        if (scrollYRef.current) {
          scrollYRef.current.value = getCurrentScrollY();
        }
      }}
    >
      <input type="hidden" name="borrowerId" value={borrowerId} />
      <input ref={scrollYRef} type="hidden" name="scrollY" />
      {selected ? <input type="hidden" name="selected" value={selected} /> : null}
      <div className="grid gap-1.5">
        <Label
          htmlFor={`notes-${verificationId}`}
          className="text-xs font-medium"
        >
          Manager note
        </Label>
        <Textarea
          id={`notes-${verificationId}`}
          name="managerReviewNotes"
          rows={2}
          maxLength={1000}
          placeholder="Add a note for this review..."
        />
      </div>
      <div className="grid gap-1.5">
        <Label
          htmlFor={`reason-${verificationId}`}
          className="text-xs font-medium"
        >
          Rejection reason
        </Label>
        <Textarea
          id={`reason-${verificationId}`}
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
          value="needs_resubmission"
          variant="outline"
          className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        >
          Needs resubmission
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

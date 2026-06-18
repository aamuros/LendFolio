"use client";

import { useRef, useState } from "react";
import { reviewLenderProfileChangeRequestAction } from "@/app/manager/actions";
import { getCurrentScrollY } from "@/app/manager/scroll-position";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

export function LenderChangeRequestDecisionForm({
  requestId,
  selected,
}: {
  requestId: string;
  selected: string;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const scrollYRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={reviewLenderProfileChangeRequestAction}
      className="grid gap-3"
      onSubmit={() => {
        if (scrollYRef.current) {
          scrollYRef.current.value = getCurrentScrollY();
        }
      }}
    >
      <input type="hidden" name="requestId" value={requestId} />
      <input ref={scrollYRef} type="hidden" name="scrollY" />
      {selected ? <input type="hidden" name="selected" value={selected} /> : null}
      <div className="grid gap-1.5">
        <Label htmlFor={`cr-notes-${requestId}`} className="text-xs font-medium">
          Manager note
        </Label>
        <Textarea
          id={`cr-notes-${requestId}`}
          name="managerReviewNotes"
          rows={2}
          maxLength={1000}
          placeholder="Add a note for this review..."
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`cr-reason-${requestId}`} className="text-xs font-medium">
          Rejection reason
        </Label>
        <Textarea
          id={`cr-reason-${requestId}`}
          name="rejectionReason"
          rows={2}
          maxLength={1000}
          placeholder="Required when rejecting..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="submit"
          name="decision"
          value="approve"
          size="sm"
        >
          <CheckCircle2Icon className="size-4" />
          Approve
        </Button>
        <Button
          type="submit"
          name="decision"
          value="reject"
          variant="destructive"
          size="sm"
          disabled={rejectionReason.trim().length === 0}
        >
          <XCircleIcon className="size-4" />
          Reject
        </Button>
      </div>
    </form>
  );
}

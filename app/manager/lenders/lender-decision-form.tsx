"use client";

import { useRef, useState } from "react";
import { reviewLenderAction } from "@/app/manager/actions";
import { getCurrentScrollY } from "@/app/manager/scroll-position";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2Icon, ShieldAlertIcon, XCircleIcon } from "lucide-react";

export function LenderDecisionForm({
  lenderId,
  selected,
  disclosuresCurrent,
  blocked,
  blockerReason,
}: {
  lenderId: string;
  selected?: string;
  disclosuresCurrent: boolean;
  blocked?: boolean;
  blockerReason?: string | null;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const scrollYRef = useRef<HTMLInputElement>(null);

  const isBlocked = blocked ?? !disclosuresCurrent;
  const reason = blockerReason ?? "Approval is on hold until required disclosures are accepted.";

  return (
    <form
      action={reviewLenderAction}
      className="grid gap-3"
      onSubmit={() => {
        if (scrollYRef.current) {
          scrollYRef.current.value = getCurrentScrollY();
        }
      }}
    >
      <input type="hidden" name="lenderProfileId" value={lenderId} />
      <input ref={scrollYRef} type="hidden" name="scrollY" />
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
      {isBlocked ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>{reason}</span>
        </div>
      ) : null}
      <div className="grid gap-2">
        {!isBlocked ? (
          <Button
            type="submit"
            name="decision"
            value="approve"
            className="w-full"
          >
            <CheckCircle2Icon className="size-4" />
            Approve
          </Button>
        ) : null}
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
        {!isBlocked ? (
          <Button
            type="submit"
            name="decision"
            value="return_to_pending"
            variant="ghost"
            className="w-full"
          >
            Return to pending
          </Button>
        ) : null}
      </div>
    </form>
  );
}

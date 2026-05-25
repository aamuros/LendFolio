"use client";

import { useState, useTransition } from "react";
import {
  rejectRepaymentProof,
  verifyRepaymentProof,
} from "@/app/lender/actions";
import type { RepaymentProofStatus } from "@/lib/supabase/types";
import { canReviewRepaymentProof } from "@/lib/workflow-rules";

type LenderRepaymentProofActionsProps = {
  proofId: string;
  proofStatus: RepaymentProofStatus;
  proofUrl: string | null;
};

export function LenderRepaymentProofActions({
  proofId,
  proofStatus,
  proofUrl,
}: LenderRepaymentProofActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const [reviewedStatus, setReviewedStatus] =
    useState<RepaymentProofStatus | null>(null);
  const canReview = canReviewRepaymentProof(reviewedStatus ?? proofStatus);

  function onVerify() {
    if (!canReview) {
      return;
    }

    setMessage("Verifying repayment...");
    setTone("success");

    startTransition(async () => {
      const result = await verifyRepaymentProof(proofId);

      setMessage(result.message);
      setTone(result.ok ? "success" : "error");
      if (result.ok) {
        setReviewedStatus("verified");
      }
    });
  }

  function onReject() {
    if (!canReview) {
      return;
    }

    setMessage("Rejecting proof...");
    setTone("success");

    startTransition(async () => {
      const result = await rejectRepaymentProof(proofId, note);

      setMessage(result.message);
      setTone(result.ok ? "success" : "error");
      if (result.ok) {
        setNote("");
        setReviewedStatus("rejected");
      }
    });
  }

  return (
    <div className="grid gap-3 border-t border-[var(--border)] pt-3">
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        {proofUrl ? (
          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            View proof
          </a>
        ) : null}
        <button
          type="button"
          onClick={onVerify}
          disabled={isPending || !canReview}
          className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reviewedStatus === "verified" ? "Verified" : "Verify repayment"}
        </button>
      </div>

      <div className="grid gap-2">
        <label htmlFor={`reject-note-${proofId}`} className="text-sm font-semibold">
          Rejection note
        </label>
        <textarea
          id={`reject-note-${proofId}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={280}
          disabled={isPending || !canReview}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          placeholder="Tell the borrower what to correct."
        />
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          Rejection notes are shown to the borrower with the corrected upload step.
        </p>
        <button
          type="button"
          onClick={onReject}
          disabled={isPending || !canReview}
          className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
        >
          {reviewedStatus === "rejected" ? "Rejected" : "Reject proof"}
        </button>
      </div>

      {!canReview && !message ? (
        <p
          className="rounded-2xl border border-[#d8dde8] bg-[#f7f9fc] px-3 py-2 text-sm leading-6 text-[var(--foreground)]"
          role="status"
        >
          This proof has already been reviewed.
        </p>
      ) : null}

      {message ? (
        <p
          className={`rounded-2xl border px-3 py-2 text-sm leading-6 ${
            tone === "error"
              ? "border-[#f3c7c7] bg-[#fff4f4] text-[#8f1d1d]"
              : "border-[#c8e6d8] bg-[#f1fbf6] text-[#0f5f45]"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

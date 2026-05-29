"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  submitLenderVerificationDocument,
  type LenderVerificationDocumentSubmitResult,
} from "@/app/lender/actions";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import {
  lenderVerificationDocumentStatusLabels,
  lenderVerificationDocumentTypeLabels,
  lenderVerificationDocumentTypes,
  lenderVerificationStatusLabels,
  type LenderVerificationSummary,
} from "@/lib/lender-verification";
import type { ConsentStatus } from "@/lib/consents";

type LenderVerificationDocumentsPanelProps = {
  verification: LenderVerificationSummary | null;
  consentStatus: ConsentStatus | null;
};

const initialState: LenderVerificationDocumentSubmitResult | null = null;

export function LenderVerificationDocumentsPanel({
  verification,
  consentStatus,
}: LenderVerificationDocumentsPanelProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    submitLenderVerificationDocument,
    initialState,
  );
  const canUpload = ["pending", "rejected"].includes(
    verification?.status ?? "",
  );

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state]);

  if (!verification || verification.status === "missing") {
    return (
      <section className="grid gap-2 rounded-3xl border border-dashed border-[var(--border)] bg-white px-5 py-5 text-sm leading-6 text-[var(--muted-foreground)]">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Lender verification
        </h3>
        <p>Lender verification is unavailable for this account.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Lender verification</h3>
          <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
            {lenderVerificationStatusLabels[verification.status]}
          </span>
        </div>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {verification.status === "approved"
            ? "Your lender account is approved."
            : verification.status === "rejected"
              ? "Upload updated documents for another review."
              : verification.documentPolicy.readyForManagerReview
                ? "Your documents are waiting for manager review."
                : "Upload lender verification documents so a manager can review your account."}
        </p>
        {verification.rejectionReason ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
            {verification.rejectionReason}
          </p>
        ) : null}
      </div>

      {consentStatus ? (
        <ConsentAcceptancePanel scope="lender_review" status={consentStatus} />
      ) : null}

      <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3">
        <p className="text-sm font-semibold">Verification checklist</p>
        <ChecklistItem
          label="Required disclosures"
          done={consentStatus?.isCurrent === true}
          pendingText="Accept Terms, Privacy Notice, and lender review consent."
        />
        {verification.documentPolicy.requiredDocumentTypes.map((documentType) => (
          <ChecklistItem
            key={documentType}
            label={lenderVerificationDocumentTypeLabels[documentType]}
            done={verification.documentPolicy.acceptedDocumentTypes.includes(
              documentType,
            )}
            pendingText={
              verification.documentPolicy.submittedDocumentTypes.includes(
                documentType,
              )
                ? "Waiting for manager acceptance."
                : "Upload this document."
            }
          />
        ))}
        <ChecklistItem
          label="Manager review"
          done={verification.status === "approved"}
          pendingText={
            verification.documentPolicy.readyForManagerReview
              ? "Wait for manager review."
              : "Complete required documents first."
          }
        />
      </div>

      {canUpload ? (
        <form ref={formRef} action={formAction} className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Document type
            <select
              name="documentType"
              className="h-11 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              required
            >
              {lenderVerificationDocumentTypes.map((type) => (
                <option key={type} value={type}>
                  {lenderVerificationDocumentTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            File
            <input
              name="documentFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-normal file:mr-3 file:rounded-full file:border-0 file:bg-[var(--muted)] file:px-4 file:py-2 file:text-sm file:font-semibold"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isPending || consentStatus?.isCurrent === false}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
          >
            {isPending ? "Uploading..." : "Upload document"}
          </button>
        </form>
      ) : null}

      {state ? (
        <p
          className={`rounded-2xl border px-3 py-2 text-sm leading-6 ${
            state.ok
              ? "border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-2">
        <p className="text-sm font-semibold">Uploaded documents</p>
        {verification.documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] px-3 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
            No verification documents uploaded.
          </p>
        ) : (
          <div className="grid gap-2">
            {verification.documents.map((document) => (
              <div
                key={document.id}
                className="grid gap-1 rounded-2xl border border-[var(--border)] px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-sm font-semibold">
                    {document.fileName}
                  </p>
                  <span className="rounded-full bg-[var(--muted)] px-2 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                    {lenderVerificationDocumentStatusLabels[document.status]}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                  {lenderVerificationDocumentTypeLabels[document.documentType]} -{" "}
                  {formatFileSize(document.fileSize)}
                </p>
                {document.reviewNotes ? (
                  <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                    {document.reviewNotes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ChecklistItem({
  done,
  label,
  pendingText,
}: {
  done: boolean;
  label: string;
  pendingText: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm leading-6">
      <div>
        <p className="font-semibold">{label}</p>
        {!done ? (
          <p className="text-[var(--muted-foreground)]">{pendingText}</p>
        ) : null}
      </div>
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${
          done
            ? "bg-emerald-50 text-emerald-700"
            : "bg-white text-[var(--muted-foreground)]"
        }`}
      >
        {done ? "Done" : "Pending"}
      </span>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  submitBorrowerVerificationDocument,
  type BorrowerVerificationDocumentSubmitResult,
} from "@/app/borrower/actions";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import {
  borrowerVerificationDocumentStatusLabels,
  borrowerVerificationDocumentTypeLabels,
  borrowerVerificationDocumentTypes,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
import type { ConsentStatus } from "@/lib/consents";

type BorrowerVerificationDocumentsPanelProps = {
  verification: BorrowerVerificationSummary | null;
  consentStatus: ConsentStatus | null;
};

const initialState: BorrowerVerificationDocumentSubmitResult | null = null;

export function BorrowerVerificationDocumentsPanel({
  verification,
  consentStatus,
}: BorrowerVerificationDocumentsPanelProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    submitBorrowerVerificationDocument,
    initialState,
  );
  const canUpload =
    verification?.status === "pending" || verification?.status === "rejected";

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }, [router, state]);

  if (!verification || verification.status === "missing") {
    return null;
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Borrower verification</h3>
          <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
            {verification.status}
          </span>
        </div>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {verification.status === "approved"
            ? "Your borrower account is approved."
            : verification.status === "rejected"
              ? "Upload an updated document for another review."
              : "Upload verification documents so a manager can review your borrower account."}
        </p>
        {verification.rejectionReason ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
            {verification.rejectionReason}
          </p>
        ) : null}
      </div>

      {consentStatus ? (
        <ConsentAcceptancePanel
          scope="borrower_document_upload"
          status={consentStatus}
        />
      ) : null}

      {canUpload ? (
        <form ref={formRef} action={formAction} className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Document type
            <select
              name="documentType"
              className="h-11 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              required
            >
              {borrowerVerificationDocumentTypes.map((type) => (
                <option key={type} value={type}>
                  {borrowerVerificationDocumentTypeLabels[type]}
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
                  <p className="text-sm font-semibold break-words">
                    {document.fileName}
                  </p>
                  <span className="rounded-full bg-[var(--muted)] px-2 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                    {borrowerVerificationDocumentStatusLabels[document.status]}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                  {borrowerVerificationDocumentTypeLabels[document.documentType]} -{" "}
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

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

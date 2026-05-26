"use client";

import type { ReactNode } from "react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  submitBorrowerVerificationDocument,
  type BorrowerVerificationDocumentSubmitResult,
} from "@/app/borrower/actions";
import { acceptUserConsentsAction } from "@/app/consents/actions";
import {
  borrowerVerificationDocumentStatusLabels,
  borrowerVerificationDocumentTypeLabels,
  borrowerVerificationDocumentTypes,
  borrowerVerificationStatusLabels,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";

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
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentMessage, setConsentMessage] = useState("");
  const [isConsentPending, startConsentTransition] = useTransition();
  const [state, formAction, isUploadPending] = useActionState(
    submitBorrowerVerificationDocument,
    initialState,
  );
  const canUpload = [
    "not_started",
    "pending",
    "pending_documents",
    "rejected",
    "needs_resubmission",
  ].includes(verification?.status ?? "");

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

  function acceptDisclosures() {
    if (!consentStatus) {
      return;
    }

    setConsentMessage("");
    startConsentTransition(async () => {
      const result = await acceptUserConsentsAction(consentStatus.scope);

      setConsentMessage(result.message);

      if (result.ok) {
        setConsentChecked(false);
        router.refresh();
      }
    });
  }

  return (
    <section className="grid gap-5 rounded-3xl bg-white px-5 py-5 shadow-sm">
      <VerificationSection>
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Borrower verification</h3>
            <StatusBadge tone={getVerificationTone(verification.status)}>
              {getVerificationLabel(verification)}
            </StatusBadge>
          </div>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {getVerificationDescription(verification)}
          </p>
          {verification.rejectionReason ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
              {verification.rejectionReason}
            </p>
          ) : null}
        </div>
      </VerificationSection>

      {consentStatus ? (
        <VerificationSection
          title="Required disclosures"
          description="Accept these before uploading verification documents."
        >
          <div className="grid gap-1">
            {consentStatus.required.map((consent) => {
              const accepted = consentStatus.accepted.find(
                (item) =>
                  item.consentType === consent.consentType &&
                  item.version === consent.version,
              );

              return (
                <CompactRow
                  key={`${consent.consentType}-${consent.version}`}
                  label={consentTypeLabels[consent.consentType]}
                  detail={
                    accepted
                      ? `Accepted ${formatDateTime(accepted.acceptedAt)}`
                      : "Not accepted"
                  }
                  badge={
                    <StatusBadge tone={accepted ? "success" : "attention"}>
                      {accepted ? "Accepted" : "Missing"}
                    </StatusBadge>
                  }
                />
              );
            })}
          </div>

          {!consentStatus.isCurrent ? (
            <div className="grid gap-3 rounded-2xl bg-[var(--background)] px-4 py-3">
              <label className="flex items-start gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(event) => setConsentChecked(event.target.checked)}
                  className="mt-1 size-4"
                />
                <span>I accept the required disclosures for verification.</span>
              </label>
              <button
                type="button"
                disabled={!consentChecked || isConsentPending}
                onClick={acceptDisclosures}
                className="inline-flex h-10 w-fit items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[#0f0f0f] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
              >
                {isConsentPending ? "Accepting..." : "Accept disclosures"}
              </button>
              {consentMessage ? (
                <p
                  className="text-sm leading-6 text-[var(--muted-foreground)]"
                  role="status"
                >
                  {consentMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </VerificationSection>
      ) : null}

      <VerificationSection title="Verification checklist">
        <div className="grid gap-1">
          <CompactRow
            label="Required disclosures"
            detail={
              consentStatus?.isCurrent
                ? "All required disclosures are accepted."
                : "Accept Terms, Privacy Notice, and Document Processing Consent."
            }
            badge={
              <StatusBadge
                tone={consentStatus?.isCurrent ? "success" : "attention"}
              >
                {consentStatus?.isCurrent ? "Done" : "Pending"}
              </StatusBadge>
            }
          />
          {verification.documentPolicy.requiredDocumentTypes.map((documentType) => {
            const status = getRequiredDocumentStatus(verification, documentType);

            return (
              <CompactRow
                key={documentType}
                label={borrowerVerificationDocumentTypeLabels[documentType]}
                detail={status.detail}
                badge={
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                }
              />
            );
          })}
          <CompactRow
            label="Manager review"
            detail={
              verification.status === "approved"
                ? "Manager review is complete."
                : verification.documentPolicy.readyForManagerReview
                  ? "Documents are ready for manager review."
                  : "Complete required documents first."
            }
            badge={
              <StatusBadge
                tone={verification.status === "approved" ? "success" : "neutral"}
              >
                {verification.status === "approved" ? "Done" : "Pending"}
              </StatusBadge>
            }
          />
          <CompactRow
            label="Application readiness"
            detail={
              verification.status === "approved" &&
              verification.documentPolicy.documentsAccepted
                ? "Loan submission is available."
                : "Loan submission opens after verification approval."
            }
            badge={
              <StatusBadge
                tone={
                  verification.status === "approved" &&
                  verification.documentPolicy.documentsAccepted
                    ? "success"
                    : "neutral"
                }
              >
                {verification.status === "approved" &&
                verification.documentPolicy.documentsAccepted
                  ? "Ready"
                  : "Locked"}
              </StatusBadge>
            }
          />
        </div>
      </VerificationSection>

      <VerificationSection title="Uploaded documents">
        {verification.documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] px-3 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
            No verification documents uploaded.
          </p>
        ) : (
          <div className="grid gap-1">
            {verification.documents.map((document) => (
              <CompactRow
                key={document.id}
                label={document.fileName}
                detail={`${borrowerVerificationDocumentTypeLabels[document.documentType]} - ${formatFileSize(document.fileSize)}`}
                note={document.reviewNotes}
                badge={
                  <StatusBadge tone={getDocumentTone(document.status)}>
                    {borrowerVerificationDocumentStatusLabels[document.status]}
                  </StatusBadge>
                }
              />
            ))}
          </div>
        )}
      </VerificationSection>

      <VerificationSection
        title={canUpload ? "Upload document" : getActionSectionTitle(verification)}
      >
        {canUpload ? (
          <form ref={formRef} action={formAction} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold">
              Document type
              <select
                name="documentType"
                className="h-11 rounded-xl border border-[var(--border)] bg-white px-3 text-base font-normal text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                required
              >
                {borrowerVerificationDocumentTypes.map((type) => (
                  <option key={type} value={type}>
                    {borrowerVerificationDocumentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              File
              <input
                name="documentFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-normal file:mr-3 file:rounded-full file:border-0 file:bg-[var(--muted)] file:px-4 file:py-2 file:text-sm file:font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isUploadPending || consentStatus?.isCurrent === false}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[#0f0f0f] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
            >
              {isUploadPending ? "Uploading..." : "Upload document"}
            </button>
          </form>
        ) : (
          <p className="rounded-2xl bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
            {getActionSectionMessage(verification)}
          </p>
        )}

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
      </VerificationSection>
    </section>
  );
}

function VerificationSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title?: string;
}) {
  return (
    <section className="grid gap-3 border-b border-[var(--border)] pb-5 last:border-b-0 last:pb-0">
      {title || description ? (
        <div className="grid gap-1">
          {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
          {description ? (
            <p className="text-sm leading-5 text-[var(--muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function CompactRow({
  badge,
  detail,
  label,
  note,
}: {
  badge: ReactNode;
  detail: string;
  label: string;
  note?: string | null;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold leading-5">{label}</p>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          {detail}
        </p>
        {note ? (
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {note}
          </p>
        ) : null}
      </div>
      <div className="pt-0.5">{badge}</div>
    </div>
  );
}

function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "attention" | "danger" | "neutral" | "success";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "attention"
        ? "bg-amber-50 text-amber-800"
        : tone === "danger"
          ? "bg-red-50 text-red-700"
          : "bg-[var(--muted)] text-[var(--muted-foreground)]";

  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function getVerificationLabel(verification: BorrowerVerificationSummary) {
  if (verification.status === "missing") {
    return "Not started";
  }

  if (
    verification.status !== "approved" &&
    verification.documentPolicy.missingRequiredDocumentTypes.length > 0
  ) {
    return "Missing documents";
  }

  return borrowerVerificationStatusLabels[verification.status];
}

function getVerificationDescription(verification: BorrowerVerificationSummary) {
  if (verification.status === "approved") {
    return "Your borrower profile is complete.";
  }

  if (
    verification.status === "rejected" ||
    verification.status === "needs_resubmission"
  ) {
    return "Upload the missing documents to continue.";
  }

  if (verification.documentPolicy.readyForManagerReview) {
    return "Your documents are waiting for manager review.";
  }

  return "Upload the missing documents to continue.";
}

function getVerificationTone(status: BorrowerVerificationSummary["status"]) {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "rejected" || status === "needs_resubmission") {
    return "danger" as const;
  }

  return "attention" as const;
}

function getRequiredDocumentStatus(
  verification: BorrowerVerificationSummary,
  documentType: BorrowerVerificationSummary["documentPolicy"]["requiredDocumentTypes"][number],
) {
  if (verification.documentPolicy.acceptedDocumentTypes.includes(documentType)) {
    return {
      label: "Done",
      detail: "Accepted for verification.",
      tone: "success" as const,
    };
  }

  if (verification.documentPolicy.rejectedDocumentTypes.includes(documentType)) {
    return {
      label: "Needs review",
      detail: "Upload an updated document.",
      tone: "danger" as const,
    };
  }

  if (verification.documentPolicy.submittedDocumentTypes.includes(documentType)) {
    return {
      label: "Submitted",
      detail: "Waiting for manager acceptance.",
      tone: "neutral" as const,
    };
  }

  return {
    label: "Missing",
    detail: "Upload this document.",
    tone: "attention" as const,
  };
}

function getDocumentTone(
  status: BorrowerVerificationSummary["documents"][number]["status"],
) {
  if (status === "accepted") {
    return "success" as const;
  }

  if (status === "rejected") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getActionSectionTitle(verification: BorrowerVerificationSummary) {
  return verification.status === "approved"
    ? "Verification complete"
    : "Review in progress";
}

function getActionSectionMessage(verification: BorrowerVerificationSummary) {
  return verification.status === "approved"
    ? "Your borrower verification is approved. No document upload is needed."
    : "Your documents are already submitted. No action is needed right now.";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

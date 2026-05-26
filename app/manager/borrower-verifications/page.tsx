import {
  reviewBorrowerVerificationAction,
  reviewBorrowerVerificationDocumentAction,
} from "@/app/manager/actions";
import { requireManager } from "@/lib/access-control";
import {
  borrowerVerificationDocumentTypeLabels,
} from "@/lib/borrower-verification";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  getShortId,
  loadManagerBorrowerVerifications,
  type ManagerBorrowerVerificationDocumentRow,
  type ManagerBorrowerVerificationRow,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  DataCard,
  EmptyState,
  Field,
  FilterGrid,
  ManagerShell,
  PersonLabel,
  SelectFilter,
  StatusBadge,
  StatusMessage,
  TextFilter,
  formatDateTime,
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    documentStatus?: string;
    borrower?: string;
    review?: string;
    documentReview?: string;
  }>;
};

export default async function ManagerBorrowerVerificationsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Borrower review"
        description="Review borrower verification status and submitted evidence."
        activeTab="borrowers"
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerBorrowerVerifications(access.supabase, {
    status: params.status,
    documentStatus: params.documentStatus,
    borrower: params.borrower,
  });

  return (
    <ManagerShell
      title="Borrower review"
      description="Open submitted evidence with short-lived links before approving borrower access."
      activeTab="borrowers"
    >
      <ReviewStatus review={params.review} documentReview={params.documentReview} />
      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />
      <FilterGrid>
        <SelectFilter
          label="Status"
          name="status"
          defaultValue={params.status}
          options={[
            { value: "pending_documents", label: "Pending documents" },
            { value: "submitted", label: "Submitted" },
            { value: "under_review", label: "Under review" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "needs_resubmission", label: "Needs resubmission" },
          ]}
        />
        <SelectFilter
          label="Document"
          name="documentStatus"
          defaultValue={params.documentStatus}
          options={[
            { value: "submitted", label: "Submitted" },
            { value: "accepted", label: "Accepted" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <TextFilter label="Borrower" name="borrower" defaultValue={params.borrower} />
      </FilterGrid>

      <section className="grid gap-3">
        {result.verifications.length === 0 ? (
          <EmptyState
            title="No borrower verifications found"
            description="Borrower verification records and evidence will appear here."
          />
        ) : null}

        {result.verifications.map((verification) => (
          <BorrowerVerificationCard
            key={verification.id}
            verification={verification}
          />
        ))}
      </section>
    </ManagerShell>
  );
}

function ReviewStatus({
  review,
  documentReview,
}: {
  review?: string;
  documentReview?: string;
}) {
  if (review === "approved") {
    return <StatusMessage message="Borrower verification approved." />;
  }

  if (review === "rejected") {
    return <StatusMessage message="Borrower verification rejected." />;
  }

  if (review === "pending") {
    return <StatusMessage message="Borrower verification returned to pending." />;
  }

  if (review === "needs-resubmission") {
    return (
      <StatusMessage message="Borrower verification marked for resubmission." />
    );
  }

  if (review === "documents-required") {
    return (
      <StatusMessage
        message="Accept the required documents before approving verification."
        tone="error"
      />
    );
  }

  if (review === "error") {
    return (
      <StatusMessage message="Could not update borrower verification." tone="error" />
    );
  }

  if (documentReview === "accepted") {
    return <StatusMessage message="Verification document accepted." />;
  }

  if (documentReview === "rejected") {
    return <StatusMessage message="Verification document rejected." />;
  }

  if (documentReview === "error") {
    return (
      <StatusMessage message="Could not update verification document." tone="error" />
    );
  }

  return null;
}

function BorrowerVerificationCard({
  verification,
}: {
  verification: ManagerBorrowerVerificationRow;
}) {
  return (
    <DataCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">
            <PersonLabel person={verification.borrower} />
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Review ID {getShortId(verification.id)}
          </p>
        </div>
        <StatusBadge status={verification.verificationStatus} />
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Submitted" value={formatDateTime(verification.submittedAt)} />
        <Field label="Created" value={formatDateTime(verification.createdAt)} />
        <Field
          label="Reviewed"
          value={
            verification.reviewedAt
              ? `${formatDateTime(verification.reviewedAt)} by ${
                  verification.reviewedBy?.displayName ?? "Manager"
                }`
              : "Not reviewed"
          }
        />
        <Field label="Documents" value={verification.documents.length.toString()} />
      </dl>

      <div className="grid gap-3 lg:grid-cols-2">
        <ConsentSummary
          title="Document upload disclosures"
          status={verification.documentUploadConsentStatus}
        />
        <ConsentSummary
          title="Loan application disclosures"
          status={verification.loanApplicationConsentStatus}
        />
      </div>

      {verification.rejectionReason || verification.managerReviewNotes ? (
        <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
          {verification.rejectionReason ? (
            <p>
              <span className="font-semibold text-[var(--foreground)]">
                Rejection reason:
              </span>{" "}
              {verification.rejectionReason}
            </p>
          ) : null}
          {verification.managerReviewNotes ? (
            <p>
              <span className="font-semibold text-[var(--foreground)]">
                Manager note:
              </span>{" "}
              {verification.managerReviewNotes}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3">
        <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3">
          <h3 className="text-sm font-semibold">Required documents</h3>
          {verification.documentPolicy.requiredDocumentTypes.map((documentType) => (
            <div
              key={documentType}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>{borrowerVerificationDocumentTypeLabels[documentType]}</span>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                {verification.documentPolicy.acceptedDocumentTypes.includes(
                  documentType,
                )
                  ? "Accepted"
                  : verification.documentPolicy.submittedDocumentTypes.includes(
                        documentType,
                      )
                    ? "Submitted"
                    : "Missing"}
              </span>
            </div>
          ))}
        </div>
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)]">
          Evidence history
        </h3>
        {verification.documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] px-3 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
            No documents uploaded.
          </p>
        ) : (
          verification.documents.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))
        )}
      </div>

      <form action={reviewBorrowerVerificationAction} className="grid gap-3">
        <input type="hidden" name="borrowerId" value={verification.borrower.id} />
        <label className="grid gap-1 text-sm font-semibold">
          Manager note
          <textarea
            name="managerReviewNotes"
            rows={3}
            maxLength={1000}
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Rejection reason
          <textarea
            name="rejectionReason"
            rows={3}
            maxLength={1000}
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="decision"
            value="approve"
            className="h-10 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Approve
          </button>
          <button
            type="submit"
            name="decision"
            value="reject"
            className="h-10 rounded-full border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
          >
            Reject
          </button>
          <button
            type="submit"
            name="decision"
            value="needs_resubmission"
            className="h-10 rounded-full border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500"
          >
            Needs resubmission
          </button>
          <button
            type="submit"
            name="decision"
            value="return_to_pending"
            className="h-10 rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Return to pending
          </button>
        </div>
      </form>
    </DataCard>
  );
}

function ConsentSummary({
  title,
  status,
}: {
  title: string;
  status: ConsentStatus;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          {status.isCurrent ? "Current" : "Missing"}
        </span>
      </div>
      <div className="grid gap-1 text-xs leading-5 text-[var(--muted-foreground)]">
        {status.required.map((consent) => {
          const accepted = status.accepted.find(
            (item) =>
              item.consentType === consent.consentType &&
              item.version === consent.version,
          );

          return (
            <p key={`${consent.consentType}-${consent.version}`}>
              <span className="font-semibold text-[var(--foreground)]">
                {consentTypeLabels[consent.consentType]}:
              </span>{" "}
              {accepted
                ? `${consent.version}, ${formatDateTime(accepted.acceptedAt)}`
                : "Missing current version"}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function DocumentRow({
  document,
}: {
  document: ManagerBorrowerVerificationDocumentRow;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border)] px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold break-words">{document.fileName}</p>
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">
            {borrowerVerificationDocumentTypeLabels[document.documentType]} -{" "}
            {formatFileSize(document.fileSize)} -{" "}
            {formatDateTime(document.uploadedAt)}
          </p>
        </div>
        <StatusBadge status={document.status} />
      </div>
      {document.reviewNotes ? (
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {document.reviewNotes}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {document.viewUrl ? (
          <a
            href={document.viewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Open document
          </a>
        ) : (
          <span className="inline-flex h-10 items-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted-foreground)]">
            Link unavailable
          </span>
        )}
        <form
          action={reviewBorrowerVerificationDocumentAction}
          className="flex flex-wrap gap-2"
        >
          <input type="hidden" name="documentId" value={document.id} />
          <input type="hidden" name="reviewNotes" value="" />
          <button
            type="submit"
            name="decision"
            value="accept"
            className="h-10 rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Accept
          </button>
          <button
            type="submit"
            name="decision"
            value="reject"
            className="h-10 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
          >
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

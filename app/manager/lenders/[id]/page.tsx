import Link from "next/link";
import { reviewLenderAction } from "@/app/manager/actions";
import { requireManager } from "@/lib/access-control";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  getShortId,
  loadManagerLenderDetail,
  type ManagerLenderRow,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  DataCard,
  EmptyState,
  Field,
  ManagerShell,
  PersonLabel,
  StatusBadge,
  StatusMessage,
  formatCurrency,
  formatDateTime,
} from "../../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    review?: string;
  }>;
};

export default async function ManagerLenderDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Lender detail"
        description="Review lender profile information before workspace access."
        
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLenderDetail(access.supabase, id);

  return (
    <ManagerShell
      title="Lender detail"
      description="Review lender profile information before workspace access."
      
    >
      <div>
        <Link
          href="/manager/lenders"
          className="text-sm font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          Back to lender review
        </Link>
      </div>

      <ReviewStatus review={query.review} />
      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      {result.lender ? (
        <LenderDetail lender={result.lender} />
      ) : (
        <EmptyState
          title="Lender not found"
          description="This lender profile is unavailable or no longer exists."
        />
      )}
    </ManagerShell>
  );
}

function ReviewStatus({ review }: { review?: string }) {
  if (review === "approved") {
    return <StatusMessage message="Lender approved." />;
  }

  if (review === "rejected") {
    return <StatusMessage message="Lender rejected." />;
  }

  if (review === "pending") {
    return <StatusMessage message="Lender returned to pending." />;
  }

  if (review === "error") {
    return <StatusMessage message="Could not update lender review." tone="error" />;
  }

  if (review === "consent-required") {
    return (
      <StatusMessage
        message="Lender must accept the required disclosures before approval."
        tone="error"
      />
    );
  }

  return null;
}

function LenderDetail({ lender }: { lender: ManagerLenderRow }) {
  return (
    <div className="grid gap-4">
      <DataCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-xl font-semibold">{lender.organizationName}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              <PersonLabel person={lender.profile} />
            </p>
          </div>
          <StatusBadge status={lender.verificationStatus} />
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Profile display name" value={lender.profile.displayName} />
          <Field label="Lender user ID" value={lender.userId} />
          <Field label="Short lender ID" value={getShortId(lender.userId)} />
          <Field label="Organization" value={lender.organizationName} />
          <Field label="Contact person" value={lender.contactPerson} />
          <Field label="Phone number" value={lender.phoneNumber} />
          <Field label="Business address" value={lender.businessAddress} />
          <Field label="Operating area" value={lender.operatingArea} />
          <Field
            label="Registration number"
            value={lender.businessRegistrationNumber ?? "Not provided"}
          />
          <Field
            label="Minimum loan amount"
            value={formatCurrency(lender.minLoanAmount)}
          />
          <Field
            label="Maximum loan amount"
            value={formatCurrency(lender.maxLoanAmount)}
          />
          <Field
            label="Typical repayment terms"
            value={lender.typicalRepaymentTerms}
          />
          <Field label="Verification status" value={lender.verificationStatus} />
          <Field
            label="Approved"
            value={
              lender.approvedAt
                ? `${formatDateTime(lender.approvedAt)} by ${
                    lender.approvedBy?.displayName ?? "Manager"
                  }`
                : "Not approved"
            }
          />
          <Field
            label="Rejected"
            value={
              lender.rejectedAt
                ? `${formatDateTime(lender.rejectedAt)} by ${
                    lender.rejectedBy?.displayName ?? "Manager"
                  }`
                : "Not rejected"
            }
          />
          <Field label="Created" value={formatDateTime(lender.createdAt)} />
          <Field label="Updated" value={formatDateTime(lender.updatedAt)} />
        </dl>

        <ConsentSummary status={lender.consentStatus} />

        <dl className="grid gap-3">
          <Field label="Lender description" value={lender.lenderDescription} />
          <Field
            label="Manager review notes"
            value={lender.managerReviewNotes ?? "No notes"}
          />
          <Field
            label="Rejection reason"
            value={lender.rejectionReason ?? "No rejection reason"}
          />
        </dl>
      </DataCard>

      {lender.verificationStatus === "pending" ? (
        <ReviewActions lender={lender} />
      ) : null}

      {lender.verificationStatus === "rejected" ? (
        <ReturnToPendingAction lender={lender} />
      ) : null}
    </div>
  );
}

function ConsentSummary({ status }: { status: ConsentStatus }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Lender disclosures</p>
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

function ReviewActions({ lender }: { lender: ManagerLenderRow }) {
  const returnPath = `/manager/lenders/${lender.id}`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DataCard>
        <h2 className="text-base font-semibold">Approve lender</h2>
        <form action={reviewLenderAction} className="grid gap-3">
          <input type="hidden" name="lenderProfileId" value={lender.id} />
          <input type="hidden" name="decision" value="approve" />
          <input type="hidden" name="returnPath" value={returnPath} />
          <ReviewNotesField />
          <button
            type="submit"
            className="inline-flex h-10 w-fit items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Approve
          </button>
        </form>
      </DataCard>

      <DataCard>
        <h2 className="text-base font-semibold">Reject lender</h2>
        <form action={reviewLenderAction} className="grid gap-3">
          <input type="hidden" name="lenderProfileId" value={lender.id} />
          <input type="hidden" name="decision" value="reject" />
          <input type="hidden" name="returnPath" value={returnPath} />
          <label className="grid gap-2 text-sm font-semibold">
            Rejection reason
            <textarea
              name="rejectionReason"
              rows={4}
              required
              className="w-full resize-y rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            />
          </label>
          <ReviewNotesField />
          <button
            type="submit"
            className="inline-flex h-10 w-fit items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-red-300 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Reject
          </button>
        </form>
      </DataCard>
    </div>
  );
}

function ReturnToPendingAction({ lender }: { lender: ManagerLenderRow }) {
  return (
    <DataCard>
      <h2 className="text-base font-semibold">Return to pending</h2>
      <form action={reviewLenderAction} className="grid gap-3">
        <input type="hidden" name="lenderProfileId" value={lender.id} />
        <input type="hidden" name="decision" value="return_to_pending" />
        <input type="hidden" name="returnPath" value={`/manager/lenders/${lender.id}`} />
        <ReviewNotesField />
        <button
          type="submit"
          className="inline-flex h-10 w-fit items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          Return to pending
        </button>
      </form>
    </DataCard>
  );
}

function ReviewNotesField() {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      Review notes
      <textarea
        name="managerReviewNotes"
        rows={4}
        maxLength={1000}
        className="w-full resize-y rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      />
    </label>
  );
}

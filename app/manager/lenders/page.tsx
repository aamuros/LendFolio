import Link from "next/link";
import { requireManager } from "@/lib/access-control";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  getShortId,
  loadManagerLenders,
  type ManagerLenderRow,
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
  formatCurrency,
  formatDateTime,
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    review?: string;
    status?: string;
  }>;
};

export default async function ManagerLendersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Lender review"
        description="Review lender accounts before workspace access."
        
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLenders(access.supabase, {
    verificationStatus: params.status,
  });

  return (
    <ManagerShell
      title="Lender review"
      description="Approve lender requests or reject accounts that should not access lender tools."
      
    >
      <ReviewStatus review={params.review} />
      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />
      <FilterGrid>
        <SelectFilter
          label="Status"
          name="status"
          defaultValue={params.status}
          options={[
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </FilterGrid>

      <section className="grid gap-3">
        {result.lenders.length === 0 ? (
          <EmptyState
            title="No lenders found"
            description="Lender signup requests will appear here."
          />
        ) : null}

        {result.lenders.map((lender) => (
          <LenderCard key={lender.id} lender={lender} />
        ))}
      </section>
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

function LenderCard({ lender }: { lender: ManagerLenderRow }) {
  return (
    <DataCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">{lender.organizationName}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            <PersonLabel person={lender.profile} />
          </p>
        </div>
        <StatusBadge status={lender.verificationStatus} />
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Contact" value={lender.contactPerson} />
        <Field label="Operating area" value={lender.operatingArea} />
        <Field
          label="Loan range"
          value={`${formatCurrency(lender.minLoanAmount)} - ${formatCurrency(
            lender.maxLoanAmount,
          )}`}
        />
        <Field label="Lender ID" value={getShortId(lender.userId)} />
        <Field label="Request ID" value={getShortId(lender.id)} />
        <Field label="Requested" value={formatDateTime(lender.createdAt)} />
        <Field
          label="Reviewed"
          value={
            lender.approvedAt
              ? `${formatDateTime(lender.approvedAt)} by ${
                  lender.approvedBy?.displayName ?? "Manager"
                }`
              : lender.rejectedAt
                ? `${formatDateTime(lender.rejectedAt)} by ${
                    lender.rejectedBy?.displayName ?? "Manager"
                  }`
              : "Not reviewed"
          }
        />
      </dl>

      <ConsentSummary status={lender.consentStatus} />

      <Link
        href={`/manager/lenders/${lender.id}`}
        className="inline-flex h-10 w-fit items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      >
        View details
      </Link>
    </DataCard>
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

import { reviewLenderAction } from "@/app/manager/actions";
import { requireManager } from "@/lib/access-control";
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
  ManagerShell,
  PersonLabel,
  StatusBadge,
  StatusMessage,
  formatDateTime,
} from "../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    review?: string;
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
        activeTab="lenders"
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLenders(access.supabase);

  return (
    <ManagerShell
      title="Lender review"
      description="Approve lender requests or reject accounts that should not access lender tools."
      activeTab="lenders"
    >
      <ReviewStatus review={params.review} />
      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

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

  if (review === "error") {
    return <StatusMessage message="Could not update lender review." tone="error" />;
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
              : "Not reviewed"
          }
        />
      </dl>

      {lender.verificationStatus === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <ReviewButton lenderProfileId={lender.id} decision="approve" />
          <ReviewButton lenderProfileId={lender.id} decision="reject" />
        </div>
      ) : null}
    </DataCard>
  );
}

function ReviewButton({
  lenderProfileId,
  decision,
}: {
  lenderProfileId: string;
  decision: "approve" | "reject";
}) {
  const isApprove = decision === "approve";

  return (
    <form action={reviewLenderAction}>
      <input type="hidden" name="lenderProfileId" value={lenderProfileId} />
      <input type="hidden" name="decision" value={decision} />
      <button
        type="submit"
        className={
          isApprove
            ? "inline-flex h-10 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            : "inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-red-300 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        }
      >
        {isApprove ? "Approve" : "Reject"}
      </button>
    </form>
  );
}

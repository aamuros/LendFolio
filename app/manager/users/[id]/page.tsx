import Link from "next/link";
import { requireManager } from "@/lib/access-control";
import {
  getShortId,
  loadManagerUserDetail,
  managerPreferredTermLabels,
} from "@/lib/manager-operations";
import type {
  ManagerBorrowerUserDetail,
  ManagerLoanRow,
  ManagerRepaymentProofRow,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  DetailItem,
  DetailSection,
  EmptyState,
  ManagerShell,
  RoleBadge,
  StatusBadge,
  StatusMessage,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  BackLink,
} from "../../manager-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="User detail"
        description="Read-only user record."
        
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerUserDetail(access.supabase, id);

  if (result.mode === "invalid-id") {
    return (
      <ManagerShell
        title="Invalid user link"
        description="This user link is not valid."
        
        showHeading={false}
      >
        <ManagerUserErrorState
          title="Invalid user link"
          message={`This user link is not valid. Received ID: ${id}. Return to users and try again.`}
        />
      </ManagerShell>
    );
  }

  if (result.mode === "not-found") {
    return (
      <ManagerShell
        title="User not found"
        description="This user record could not be found."
        
        showHeading={false}
      >
        <ManagerUserErrorState
          title="User not found"
          message="This user record could not be found. Return to users and try again."
        />
      </ManagerShell>
    );
  }

  if (result.mode === "supabase") {
    return (
      <ManagerShell
        title="Could not load user"
        description="This user record could not be loaded."
        
        showHeading={false}
      >
        <ManagerUserErrorState
          title="Could not load user"
          message={result.message}
        />
      </ManagerShell>
    );
  }

  if (!result.user) {
    return (
      <ManagerShell
        title="Could not load user"
        description="This user record could not be loaded."
        
        showHeading={false}
      >
        <ManagerUserErrorState
          title="Could not load user"
          message="This user record could not be loaded. Return to users and try again."
        />
      </ManagerShell>
    );
  }

  const { user } = result;

  return (
    <ManagerShell
      title={user.profile.displayName}
      description="Read-only manager view of this user and related activity."
      
      showHeading={false}
    >
      <section className="grid gap-3">
        <BackLink href="/manager/lookup" label="Back to users" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-semibold">
              {user.profile.displayName}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              User {getShortId(user.profile.id)} · {user.role}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
        </div>
      </section>

      {!result.ok ? <StatusMessage message={result.message} tone="error" /> : null}

      <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="Account">
            <DetailItem
              label="Display name"
              value={user.profile.displayName}
            />
            <DetailItem
              label="Short ID"
              value={getShortId(user.profile.id)}
            />
            <DetailItem label="Profile ID" value={user.profile.id} />
            <DetailItem label="Role" value={<RoleBadge role={user.role} />} />
            <DetailItem
              label="Status"
              value={<StatusBadge status={user.status} />}
            />
          </DetailSection>

          <DetailSection title="Activity summary">
            {user.role === "borrower" ? (
              <>
                <DetailItem
                  label="Applications"
                  value={user.applications.length}
                />
                <DetailItem
                  label="Active loans"
                  value={user.activeLoans.length}
                />
                <DetailItem
                  label="Latest application"
                  value={
                    user.latestApplicationStatus ? (
                      <StatusBadge status={user.latestApplicationStatus} />
                    ) : (
                      "None"
                    )
                  }
                />
              </>
            ) : null}
            {user.role === "lender" ? (
              <>
                <DetailItem label="Offers" value={user.offers.length} />
                <DetailItem
                  label="Accepted offers"
                  value={
                    user.offers.filter((offer) => offer.status === "accepted")
                      .length
                  }
                />
                <DetailItem
                  label="Pending offers"
                  value={
                    user.offers.filter((offer) => offer.status === "pending")
                      .length
                  }
                />
                <DetailItem
                  label="Active loans"
                  value={user.activeLoans.length}
                />
                <DetailItem
                  label="Proofs awaiting review"
                  value={user.submittedProofs.length}
                />
              </>
            ) : null}
            {user.role === "manager" ? (
              <>
                <DetailItem label="Role" value={<RoleBadge role={user.role} />} />
                <DetailItem
                  label="Status"
                  value={<StatusBadge status={user.status} />}
                />
                <DetailItem
                  label="Short ID"
                  value={getShortId(user.profile.id)}
                />
              </>
            ) : null}
          </DetailSection>
        </div>
      </section>

      {user.role === "borrower" ? (
        <>
          <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-2">
              <DetailSection title="Borrower profile">
                <DetailItem
                  label="Location"
                  value={user.portfolio?.location ?? "Not provided"}
                />
                <DetailItem
                  label="Business type"
                  value={user.portfolio?.business_type ?? "Not provided"}
                />
                <DetailItem
                  label="Years in operation"
                  value={
                    user.portfolio?.years_in_operation ?? "Not provided"
                  }
                />
                <DetailItem
                  label="Loan purpose context"
                  value={
                    user.portfolio?.loan_purpose_context ?? "Not provided"
                  }
                />
              </DetailSection>

              <DetailSection title="Financial profile">
                <DetailItem
                  label="Monthly revenue"
                  value={
                    user.portfolio
                      ? formatCurrency(user.portfolio.monthly_gross_revenue)
                      : "Not provided"
                  }
                />
                <DetailItem
                  label="Monthly expenses"
                  value={
                    user.portfolio
                      ? formatCurrency(user.portfolio.monthly_expenses)
                      : "Not provided"
                  }
                />
                <DetailItem
                  label="Existing loan payments"
                  value={
                    user.portfolio
                      ? formatCurrency(user.portfolio.existing_loan_payments)
                      : "Not provided"
                  }
                />
              </DetailSection>
            </div>
          </section>

          <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Applications</h2>
            <ApplicationList applications={user.applications} />
          </section>

          <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Active loans</h2>
            <LoanList loans={user.activeLoans} />
          </section>
        </>
      ) : null}

      {user.role === "lender" ? (
        <>
          <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-2">
              <DetailSection title="Lender organization">
                <DetailItem
                  label="Organization"
                  value={
                    user.lenderProfile?.organization_name ?? "Not provided"
                  }
                />
                <DetailItem
                  label="Verification"
                  value={
                    user.lenderProfile?.verification_status ? (
                      <StatusBadge
                        status={user.lenderProfile.verification_status}
                      />
                    ) : (
                      "Not provided"
                    )
                  }
                />
                <DetailItem
                  label="Approved at"
                  value={formatDateTime(user.lenderProfile?.approved_at ?? null)}
                />
              </DetailSection>

              <DetailSection title="Offer activity">
                <DetailItem label="Offers" value={user.offers.length} />
                <DetailItem
                  label="Accepted"
                  value={
                    user.offers.filter((offer) => offer.status === "accepted")
                      .length
                  }
                />
                <DetailItem
                  label="Pending"
                  value={
                    user.offers.filter((offer) => offer.status === "pending")
                      .length
                  }
                />
                <DetailItem
                  label="Declined"
                  value={
                    user.offers.filter((offer) => offer.status === "declined")
                      .length
                  }
                />
              </DetailSection>
            </div>
          </section>

          <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Active loans</h2>
            <LoanList loans={user.activeLoans} />
          </section>

          <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Proof review workload</h2>
            <ProofList proofs={user.submittedProofs} />
          </section>
        </>
      ) : null}
    </ManagerShell>
  );
}

function ManagerUserErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <BackLink href="/manager/lookup" label="Back to users" />
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold">{title}</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {message}
        </p>
      </div>
    </section>
  );
}

function ApplicationList({
  applications,
}: {
  applications: ManagerBorrowerUserDetail["applications"];
}) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications"
        description="Submitted applications for this borrower will appear here."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {applications.map((application) => (
        <article
          key={application.id}
          className="grid gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Application {getShortId(application.id)}
            </h3>
            <StatusBadge status={application.status} />
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <DetailItem
              label="Requested"
              value={formatCurrency(application.requestedAmount)}
            />
            <DetailItem
              label="Term"
              value={managerPreferredTermLabels[application.preferredTerm]}
            />
            <DetailItem
              label="Offers"
              value={Object.values(application.offerCounts).reduce(
                (total, count) => total + count,
                0,
              )}
            />
            <DetailItem label="Purpose" value={application.purpose} />
            <DetailItem
              label="Active loan"
              value={
                application.activeLoan
                  ? `${formatCurrency(
                      application.activeLoan.outstandingBalance,
                    )} outstanding`
                  : "None"
              }
            />
          </dl>
        </article>
      ))}
    </div>
  );
}

function LoanList({
  loans,
}: {
  loans: ManagerLoanRow[];
}) {
  if (loans.length === 0) {
    return (
      <EmptyState
        title="No active loans"
        description="Active loans for this user will appear here."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {loans.map((loan) => (
        <article
          key={loan.id}
          className="grid gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Loan {getShortId(loan.id)}</h3>
            <StatusBadge status={loan.status} />
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <DetailItem
              label="Principal"
              value={formatCurrency(loan.principalAmount)}
            />
            <DetailItem
              label="Outstanding"
              value={formatCurrency(loan.outstandingBalance)}
            />
            <DetailItem label="Due date" value={formatDateOnly(loan.dueDate)} />
          </dl>
        </article>
      ))}
    </div>
  );
}

function ProofList({
  proofs,
}: {
  proofs: ManagerRepaymentProofRow[];
}) {
  if (proofs.length === 0) {
    return (
      <EmptyState
        title="No submitted proofs"
        description="Submitted repayment proofs for this lender will appear here."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {proofs.map((proof) => (
        <Link
          key={proof.id}
          href={`/manager/repayments/${proof.id}`}
          className="grid gap-2 border-b border-[var(--border)] pb-3 text-sm transition last:border-b-0 last:pb-0 hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          <span className="font-semibold">{proof.fileName}</span>
          <span className="text-xs text-[var(--muted-foreground)]">
            Loan {getShortId(proof.activeLoanId)} · Installment{" "}
            {proof.installmentNumber} · {formatCurrency(proof.amountDue)}
          </span>
        </Link>
      ))}
    </div>
  );
}

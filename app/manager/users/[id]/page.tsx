import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
import { requireManager } from "@/lib/access-control";
import {
  getShortId,
  loadManagerUserDetail,
  managerPreferredTermLabels,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  EmptyState,
  ManagerShell,
  RoleBadge,
  StatusBadge,
  StatusMessage,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
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
        activeTab="lookup"
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerUserDetail(access.supabase, id);

  if (!result.user) notFound();

  const { user } = result;

  return (
    <ManagerShell
      title={user.profile.displayName}
      description="Read-only manager view of this user and related activity."
      activeTab="lookup"
    >
      <Link
        href="/manager/lookup"
        className="w-fit text-sm font-semibold text-[var(--primary)] transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      >
        Back to lookup
      </Link>

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <RoleBadge role={user.role} />
          <StatusBadge status={user.status} />
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <Detail label="Short ID">{getShortId(user.profile.id)}</Detail>
          <Detail label="Profile ID">{user.profile.id}</Detail>
          <Detail label="Role">{user.role}</Detail>
        </dl>
      </section>

      {user.role === "borrower" ? (
        <>
          <DetailSection title="Borrower Profile">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Detail label="Location">
                {user.portfolio?.location ?? "Not provided"}
              </Detail>
              <Detail label="Business type">
                {user.portfolio?.business_type ?? "Not provided"}
              </Detail>
              <Detail label="Monthly revenue">
                {user.portfolio
                  ? formatCurrency(user.portfolio.monthly_gross_revenue)
                  : "Not provided"}
              </Detail>
              <Detail label="Monthly expenses">
                {user.portfolio
                  ? formatCurrency(user.portfolio.monthly_expenses)
                  : "Not provided"}
              </Detail>
              <Detail label="Existing loan payments">
                {user.portfolio
                  ? formatCurrency(user.portfolio.existing_loan_payments)
                  : "Not provided"}
              </Detail>
              <Detail label="Years in operation">
                {user.portfolio?.years_in_operation ?? "Not provided"}
              </Detail>
              <Detail label="Loan purpose context">
                {user.portfolio?.loan_purpose_context ?? "Not provided"}
              </Detail>
            </dl>
          </DetailSection>

          <DetailSection title="Applications">
            {user.applications.length === 0 ? (
              <EmptyState
                title="No applications"
                description="Submitted applications for this borrower will appear here."
              />
            ) : (
              <div className="grid gap-2">
                {user.applications.map((application) => (
                  <div
                    key={application.id}
                    className="grid gap-2 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">
                        Application {getShortId(application.id)}
                      </h2>
                      <StatusBadge status={application.status} />
                    </div>
                    <dl className="grid gap-2 text-sm sm:grid-cols-3">
                      <Detail label="Requested">
                        {formatCurrency(application.requestedAmount)}
                      </Detail>
                      <Detail label="Term">
                        {managerPreferredTermLabels[application.preferredTerm]}
                      </Detail>
                      <Detail label="Offers">
                        {Object.values(application.offerCounts).reduce(
                          (total, count) => total + count,
                          0,
                        )}
                      </Detail>
                      <Detail label="Purpose">{application.purpose}</Detail>
                      <Detail label="Active loan">
                        {application.activeLoan
                          ? `${formatCurrency(
                              application.activeLoan.outstandingBalance,
                            )} outstanding`
                          : "None"}
                      </Detail>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </DetailSection>

          <DetailSection title="Active Loans">
            <LoanList loans={user.activeLoans} />
          </DetailSection>
        </>
      ) : null}

      {user.role === "lender" ? (
        <>
          <DetailSection title="Lender Organization">
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <Detail label="Organization">
                {user.lenderProfile?.organization_name ?? "Not provided"}
              </Detail>
              <Detail label="Verification">
                {user.lenderProfile?.verification_status ? (
                  <StatusBadge status={user.lenderProfile.verification_status} />
                ) : (
                  "Not provided"
                )}
              </Detail>
              <Detail label="Approved at">
                {formatDateTime(user.lenderProfile?.approved_at ?? null)}
              </Detail>
            </dl>
          </DetailSection>

          <DetailSection title="Offer Activity">
            <dl className="grid gap-2 text-sm sm:grid-cols-4">
              <Detail label="Offers">{user.offers.length}</Detail>
              <Detail label="Accepted">
                {user.offers.filter((offer) => offer.status === "accepted").length}
              </Detail>
              <Detail label="Pending">
                {user.offers.filter((offer) => offer.status === "pending").length}
              </Detail>
              <Detail label="Declined">
                {user.offers.filter((offer) => offer.status === "declined").length}
              </Detail>
            </dl>
          </DetailSection>

          <DetailSection title="Active Loans">
            <LoanList loans={user.activeLoans} />
          </DetailSection>

          <DetailSection title="Proof Review Workload">
            {user.submittedProofs.length === 0 ? (
              <EmptyState
                title="No submitted proofs"
                description="Submitted repayment proofs for this lender will appear here."
              />
            ) : (
              <div className="grid gap-2">
                {user.submittedProofs.map((proof) => (
                  <Link
                    key={proof.id}
                    href={`/manager/repayments/${proof.id}`}
                    className="grid gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm transition hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                  >
                    <span className="font-semibold">{proof.fileName}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Loan {getShortId(proof.activeLoanId)} · installment{" "}
                      {proof.installmentNumber} · {formatCurrency(proof.amountDue)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </DetailSection>
        </>
      ) : null}
    </ManagerShell>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium">{children}</dd>
    </div>
  );
}

function LoanList({
  loans,
}: {
  loans: Array<{
    id: string;
    principalAmount: number;
    outstandingBalance: number;
    status: string;
    dueDate: string;
  }>;
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
    <div className="grid gap-2">
      {loans.map((loan) => (
        <div
          key={loan.id}
          className="grid gap-2 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Loan {getShortId(loan.id)}</h3>
            <StatusBadge status={loan.status} />
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <Detail label="Principal">
              {formatCurrency(loan.principalAmount)}
            </Detail>
            <Detail label="Outstanding">
              {formatCurrency(loan.outstandingBalance)}
            </Detail>
            <Detail label="Due date">{formatDateOnly(loan.dueDate)}</Detail>
          </dl>
        </div>
      ))}
    </div>
  );
}

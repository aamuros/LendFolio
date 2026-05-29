import { getManagerAccess } from "../../manager-access";
import {
  getShortId,
  loadManagerLoanDetail,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  BackLink,
  DetailItem,
  DetailSection,
  EmptyState,
  ManagerDetailsLink,
  ManagerShell,
  PersonLabel,
  StatusBadge,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from "../../manager-ui";



type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerLoanDetailPage({ params }: PageProps) {
  const { id } = await params;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Loan detail"
        description="Read-only loan record."
        
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLoanDetail(access.supabase, id);

  if (result.mode === "invalid-id") {
    return (
      <ManagerShell
        title="Invalid loan link"
        description="This loan link is not valid."
        
        showHeading={false}
      >
        <ManagerLoanErrorState
          title="Invalid loan link"
          message={`This loan link is not valid. Received ID: ${id}. Return to loans and try again.`}
        />
      </ManagerShell>
    );
  }

  if (result.mode === "not-found") {
    return (
      <ManagerShell
        title="Loan not found"
        description="This loan record could not be found."
        
        showHeading={false}
      >
        <ManagerLoanErrorState
          title="Loan not found"
          message="This loan record could not be found. Return to loans and try again."
        />
      </ManagerShell>
    );
  }

  if (result.mode === "supabase") {
    return (
      <ManagerShell
        title="Could not load loan"
        description="This loan record could not be loaded."
        
        showHeading={false}
      >
        <ManagerLoanErrorState title="Could not load loan" message={result.message} />
      </ManagerShell>
    );
  }

  if (!result.loan) {
    return (
      <ManagerShell
        title="Could not load loan"
        description="This loan record could not be loaded."
        
        showHeading={false}
      >
        <ManagerLoanErrorState
          title="Could not load loan"
          message="This loan record could not be loaded. Return to loans and try again."
        />
      </ManagerShell>
    );
  }

  const loan = result.loan;

  return (
    <ManagerShell
      title={`Loan ${getShortId(loan.id)}`}
      description="Read-only manager view of this funded loan."
      
      showHeading={false}
    >
      <section className="grid gap-3">
        <BackLink href="/manager/loans" label="Back to loans" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-semibold">
              Loan {getShortId(loan.id)}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {loan.borrower.displayName} &rarr; {loan.lender.displayName}
            </p>
          </div>
          <StatusBadge status={loan.status} />
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="Overview">
            <DetailItem label="Short ID" value={getShortId(loan.id)} />
            <DetailItem label="Loan ID" value={loan.id} />
            <DetailItem label="Status" value={<StatusBadge status={loan.status} />} />
            <DetailItem label="Started" value={formatDateOnly(loan.startedAt)} />
            <DetailItem label="Due date" value={formatDateOnly(loan.dueDate)} />
          </DetailSection>

          <DetailSection title="Parties">
            <DetailItem
              label="Borrower"
              value={<PersonLabel person={loan.borrower} />}
            />
            <DetailItem
              label="Lender"
              value={<PersonLabel person={loan.lender} />}
            />
          </DetailSection>

          <DetailSection title="Amounts">
            <DetailItem
              label="Principal"
              value={formatCurrency(loan.principalAmount)}
            />
            <DetailItem
              label="Repayment amount"
              value={formatCurrency(loan.repaymentAmount)}
            />
            <DetailItem
              label="Outstanding balance"
              value={formatCurrency(loan.outstandingBalance)}
            />
          </DetailSection>

          <DetailSection title="Repayment progress">
            <DetailItem
              label="Installments"
              value={loan.schedule.installmentCount}
            />
            <DetailItem label="Verified" value={loan.schedule.verifiedCount} />
            <DetailItem label="Submitted" value={loan.schedule.submittedCount} />
            <DetailItem label="Rejected" value={loan.schedule.rejectedCount} />
            <DetailItem
              label="Next due"
              value={formatDateOnly(loan.schedule.nextDueDate)}
            />
          </DetailSection>
        </div>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Repayment schedule</h2>
          {loan.repaymentSchedules.length === 0 ? (
            <EmptyState
              title="No schedule found"
              description="Repayment installments for this loan will appear here."
            />
          ) : (
            <div className="grid gap-2">
              {loan.repaymentSchedules.map((schedule) => (
                <article
                  key={schedule.id}
                  className="grid gap-1 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2 sm:grid-cols-[0.8fr_1fr_1fr_0.8fr] sm:items-center sm:gap-3"
                >
                  <p className="text-sm font-semibold">
                    Installment {schedule.installmentNumber}
                  </p>
                  <p className="text-sm">{formatCurrency(schedule.amountDue)}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {formatDateOnly(schedule.dueDate)}
                  </p>
                  <StatusBadge status={schedule.status} />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Proofs</h2>
          {loan.repaymentProofs.length === 0 ? (
            <EmptyState
              title="No proofs found"
              description="Repayment proofs for this loan will appear here."
            />
          ) : (
            <div className="grid gap-2">
              {loan.repaymentProofs.map((proof) => (
                <article
                  key={proof.id}
                  className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2 sm:grid-cols-[minmax(0,1.5fr)_0.8fr_0.8fr_1fr_5rem] sm:items-center sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {proof.fileName}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Proof {getShortId(proof.id)}
                    </p>
                  </div>
                  <p className="text-sm">Installment {proof.installmentNumber}</p>
                  <StatusBadge status={proof.proofStatus} />
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {formatDateTime(proof.submittedAt)}
                  </p>
                  <span className="sm:justify-self-end">
                    <ManagerDetailsLink href={`/manager/repayments/${proof.id}`} />
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ManagerShell>
  );
}

function ManagerLoanErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section
      className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm"
      role="alert"
    >
      <BackLink href="/manager/loans" label="Back to loans" />
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {message}
        </p>
      </div>
    </section>
  );
}

import { notFound } from "next/navigation";
import { getManagerAccess } from "../../manager-access";
import {
  getShortId,
  loadManagerRepaymentProofDetail,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  DetailItem,
  DetailSection,
  ManagerShell,
  PersonLabel,
  StatusBadge,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  BackLink,
} from "../../manager-ui";



type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerRepaymentProofDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Repayment proof"
        description="Read-only proof record."
        
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerRepaymentProofDetail(access.supabase, id);

  if (!result.proof) notFound();

  const { proof } = result;

  return (
    <ManagerShell
      title={proof.fileName}
      description="Read-only repayment proof details and review metadata."
      
      showHeading={false}
    >
      <section className="grid gap-3">
        <BackLink href="/manager/repayments" label="Back to repayment proofs" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-semibold">
              {proof.fileName}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Loan {getShortId(proof.activeLoanId)} · Installment{" "}
              {proof.installmentNumber}
            </p>
          </div>
          <StatusBadge status={proof.proofStatus} />
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="Overview">
            <DetailItem label="File name" value={proof.fileName} />
            <DetailItem
              label="Proof status"
              value={<StatusBadge status={proof.proofStatus} />}
            />
            {proof.repaymentStatus !== proof.proofStatus ? (
              <DetailItem
                label="Repayment status"
                value={<StatusBadge status={proof.repaymentStatus} />}
              />
            ) : null}
            <DetailItem
              label="File type"
              value={proof.fileType ?? "Not provided"}
            />
            <DetailItem
              label="File size"
              value={
                proof.fileSize
                  ? `${Math.round(proof.fileSize / 1024)} KB`
                  : "Not provided"
              }
            />
          </DetailSection>

          <DetailSection title="Parties">
            <DetailItem
              label="Borrower"
              value={<PersonLabel person={proof.borrower} />}
            />
            <DetailItem
              label="Lender"
              value={<PersonLabel person={proof.lender} />}
            />
          </DetailSection>

          <DetailSection title="Repayment">
            <DetailItem
              label="Active loan ID"
              value={getShortId(proof.activeLoanId)}
            />
            <DetailItem
              label="Installment"
              value={proof.installmentNumber}
            />
            <DetailItem
              label="Amount due"
              value={formatCurrency(proof.amountDue)}
            />
            <DetailItem
              label="Due date"
              value={formatDateOnly(proof.dueDate)}
            />
          </DetailSection>

          <DetailSection title="Review">
            <DetailItem
              label="Submitted"
              value={formatDateTime(proof.submittedAt)}
            />
            <DetailItem
              label="Reviewed"
              value={formatDateTime(proof.reviewedAt)}
            />
            <DetailItem
              label="Review notes"
              value={proof.reviewNotes ?? "No notes"}
            />
          </DetailSection>
        </div>
      </section>
    </ManagerShell>
  );
}

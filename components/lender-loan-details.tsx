import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LenderRepaymentProofActions } from "@/components/lender-repayment-proof-actions";
import { ProofPreviewButton } from "@/app/lender/proof-preview-button";
import { RepaymentChannelsManager } from "@/components/lender-repayment-channels";
import { CollapsibleSection } from "@/components/lender-collapsible-section";
import { ToneBadge } from "@/components/borrower-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LenderOfferReview } from "@/lib/lender-applications";
import { formatCurrency, formatDate } from "@/lib/lender-format";
import { formatDateOnly } from "@/lib/manager-date-format";
import { cn } from "@/lib/utils";

type ActiveLoan = NonNullable<LenderOfferReview["activeLoan"]>;

export function LenderLoanDetail({ offer }: { offer: LenderOfferReview }) {
  const activeLoan = offer.activeLoan;
  const context = getOfferContext(offer);

  if (!activeLoan) {
    return null;
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <Button asChild variant="ghost" className="h-auto w-fit px-0 text-sm font-semibold">
            <Link href="/lender?tab=loans">
              Back to loans
            </Link>
          </Button>
          <h1 className="text-xl font-semibold sm:text-2xl">{context}</h1>
          <p className="text-sm text-muted-foreground">
            {offer.application?.purpose ?? "Active loan"}
          </p>
        </div>
        <LoanStatusBadge status={activeLoan.status} />
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardContent className="grid gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Loan summary
              </p>
              <p className="text-sm text-muted-foreground">
                Accepted offer sent {formatDate(offer.sentAt)}
              </p>
            </div>
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <Link href={`/lender/applications/${offer.application?.id ?? offer.applicationId}`}>
                Application
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <MiniMetric
              label="Principal"
              value={`PHP ${formatCurrency(activeLoan.principalAmount)}`}
            />
            <MiniMetric
              label="Interest/service charge"
              value={`PHP ${formatCurrency(activeLoan.interestAmount)}`}
            />
            <MiniMetric
              label="Borrower-paid fees"
              value={`PHP ${formatCurrency(activeLoan.fees)}`}
            />
            <MiniMetric
              label="Total repayment"
              value={`PHP ${formatCurrency(activeLoan.totalRepaymentAmount)}`}
            />
            <MiniMetric
              label="Outstanding"
              value={`PHP ${formatCurrency(activeLoan.outstandingBalance)}`}
            />
            <MiniMetric label="Due" value={formatDateOnly(activeLoan.dueDate)} />
          </dl>

          <Separator />

          {activeLoan.repaymentChannel || activeLoan.additionalRepaymentChannels.length > 0 ? (
            <RepaymentChannelsManager
              activeLoanId={activeLoan.id}
              originalChannel={activeLoan.repaymentChannel}
              originalAccountName={activeLoan.repaymentAccountName}
              originalAccountNumber={activeLoan.repaymentAccountNumber}
              originalInstructions={activeLoan.repaymentInstructions}
              additionalChannels={activeLoan.additionalRepaymentChannels}
              isLoanActive={activeLoan.status === "active" || activeLoan.status === "overdue"}
            />
          ) : null}

          {activeLoan.schedule.length > 0 ? (
            <CollapsibleSection
              triggerLabel="Repayment schedule"
              defaultOpen={activeLoan.schedule.some((r) => r.latestProof?.status === "submitted")}
            >
              <div className="divide-y divide-border/60">
                {activeLoan.schedule.map((repayment) => (
                  <RepaymentScheduleItem key={repayment.id} repayment={repayment} />
                ))}
              </div>
            </CollapsibleSection>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function RepaymentScheduleItem({
  repayment,
}: {
  repayment: ActiveLoan["schedule"][number];
}) {
  const latestProof = repayment.latestProof;
  const needsReview = latestProof?.status === "submitted";

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          Installment #{repayment.installmentNumber}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          PHP {formatCurrency(repayment.amountDue)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Due {formatDateOnly(repayment.dueDate)}
        {needsReview ? (
          <span className="font-medium text-foreground">
            {" · "}Needs review
          </span>
        ) : latestProof ? (
          ` · ${formatRepaymentStatus(repayment.status)}`
        ) : (
          " · Awaiting borrower proof"
        )}
      </p>

      {needsReview && latestProof ? (
        <div className="mt-3">
          <LenderRepaymentProofActions
            proofId={latestProof.id}
            proofStatus={latestProof.status}
            proofUrl={latestProof.viewUrl}
            proofFileName={latestProof.fileName}
            proofFileSize={latestProof.fileSize}
            proofFileType={latestProof.fileType}
          />
        </div>
      ) : null}

      {repayment.proofs.length > 0 ? (
        <div className="mt-3">
          <CollapsibleSection triggerLabel="Proof history">
            <LenderProofHistory
              currentSubmittedProofId={needsReview && latestProof ? latestProof.id : null}
              proofs={repayment.proofs}
            />
          </CollapsibleSection>
        </div>
      ) : null}
    </div>
  );
}

export function LoanStatusBadge({ status }: { status: string }) {
  const tone = status === "overdue" ? "danger" : "success";
  return <ToneBadge tone={tone}>{status}</ToneBadge>;
}

function LenderProofHistory({
  currentSubmittedProofId,
  proofs,
}: {
  currentSubmittedProofId: string | null;
  proofs: ActiveLoan["schedule"][number]["proofs"];
}) {
  return (
    <div className="grid gap-2">
      {proofs.map((proof) => (
        <div
          key={proof.id}
          className="grid gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid gap-1">
              <p className="break-words text-sm font-semibold">{proof.fileName}</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Submitted {formatDate(proof.submittedAt)}
                {proof.reviewedAt ? ` · Reviewed ${formatDate(proof.reviewedAt)}` : ""}
              </p>
            </div>
            <ProofStatusBadge status={proof.status} />
          </div>
          {proof.reviewNotes ? (
            <p className="text-xs text-muted-foreground">
              Note: {proof.reviewNotes}
            </p>
          ) : null}
          {proof.id === currentSubmittedProofId ? (
            <LenderRepaymentProofActions
              proofId={proof.id}
              proofStatus={proof.status}
              proofUrl={proof.viewUrl}
              proofFileName={proof.fileName}
              proofFileSize={proof.fileSize}
              proofFileType={proof.fileType}
            />
          ) : proof.viewUrl ? (
            <ProofPreviewButton
              fileName={proof.fileName}
              fileSize={proof.fileSize}
              fileType={proof.fileType}
              viewUrl={proof.viewUrl}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ProofStatusBadge({ status }: { status: string }) {
  const tone =
    status === "rejected"
      ? "danger"
      : status === "verified"
        ? "success"
        : "neutral";

  return <ToneBadge tone={tone}>{formatProofStatus(status)}</ToneBadge>;
}

export function MiniMetric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "break-words font-semibold tabular-nums",
          compact ? "mt-0.5 text-sm" : "mt-1",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function getOfferContext(offer: LenderOfferReview) {
  return offer.application?.portfolio
    ? `${offer.application.portfolio.businessTypeLabel} in ${offer.application.portfolio.location}`
    : "Application context unavailable";
}

export function formatProofStatus(status: string) {
  if (status === "submitted") {
    return "Waiting for review";
  }

  if (status === "verified") {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return status;
}

export function formatRepaymentStatus(status: string) {
  if (status === "due") {
    return "Payment due";
  }

  if (status === "submitted") {
    return "Proof under review";
  }

  if (status === "verified") {
    return "Payment verified";
  }

  if (status === "rejected") {
    return "Needs corrected proof";
  }

  if (status === "late") {
    return "Payment overdue";
  }

  return status;
}

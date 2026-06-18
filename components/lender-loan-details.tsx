import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LenderRepaymentProofActions } from "@/components/lender-repayment-proof-actions";
import { ProofPreviewButton } from "@/app/lender/proof-preview-button";
import { RepaymentChannelsManager } from "@/components/lender-repayment-channels";
import { LenderFundsReleaseForm } from "@/components/lender-funds-release-form";
import { CollapsibleSection } from "@/components/lender-collapsible-section";
import { ToneBadge } from "@/components/borrower-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LenderOfferReview } from "@/lib/lender-applications";
import { isCompletedLoan } from "@/lib/active-loan-status";
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

  const isReadOnly = isCompletedLoan(activeLoan);
  const isAwaitingRelease = activeLoan.disbursementStatus === "awaiting_release";
  const isFundsReleased = activeLoan.disbursementStatus === "released_by_lender";
  const isReleaseDisputed = activeLoan.disbursementStatus === "release_disputed";
  const fundsReceived = activeLoan.disbursementStatus === "received_by_borrower";

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
            {isReadOnly
              ? "Completed loan summary"
              : (offer.application?.purpose ?? "Active loan")}
          </p>
        </div>
        <LoanStatusBadge
          status={activeLoan.status}
          disbursementStatus={activeLoan.disbursementStatus}
        />
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
              label="System processing fee"
              value={`PHP ${formatCurrency(activeLoan.processingFee)}`}
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

          {isReadOnly ? (
            <Alert>
              <AlertDescription className="font-semibold">
                This loan is completed. Repayment and proof details are shown for history only.
              </AlertDescription>
            </Alert>
          ) : null}

          {!isReadOnly &&
          isAwaitingRelease ? (
            <Alert>
              <AlertDescription className="grid gap-3">
                <span className="font-semibold">
                  Borrower accepted this offer. Release the funds, then mark this loan as released.
                </span>
                <LenderFundsReleaseForm activeLoanId={activeLoan.id} />
              </AlertDescription>
            </Alert>
          ) : null}

          {!isReadOnly && isFundsReleased ? (
            <Alert>
              <AlertDescription className="font-semibold">
                Funds were marked released. Waiting for the borrower to confirm receipt.
              </AlertDescription>
            </Alert>
          ) : null}

          {!isReadOnly && isReleaseDisputed ? (
            <Alert variant="destructive">
              <AlertDescription className="grid gap-2">
                <span className="font-semibold">
                  Borrower reported funds not received.
                </span>
                <span>
                  Reported {activeLoan.releaseDisputedAt ? formatDate(activeLoan.releaseDisputedAt) : "by borrower"}
                </span>
                {activeLoan.releaseDisputeReason ? (
                  <span>Reason: {activeLoan.releaseDisputeReason}</span>
                ) : null}
                <span>
                  Repayment management is paused until the release is reviewed.
                </span>
              </AlertDescription>
            </Alert>
          ) : null}

          {!isReadOnly && fundsReceived ? (
            <Alert>
              <AlertDescription className="font-semibold">
                Borrower confirmed receipt. Repayment workflow is active.
              </AlertDescription>
            </Alert>
          ) : null}

          {!isReadOnly &&
          fundsReceived &&
          (activeLoan.repaymentChannel ||
            activeLoan.additionalRepaymentChannels.length > 0) ? (
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
                  <RepaymentScheduleItem
                    key={repayment.id}
                    isReadOnly={isReadOnly}
                    repayment={repayment}
                  />
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
  isReadOnly = false,
  repayment,
}: {
  isReadOnly?: boolean;
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

      {repayment.proofs.length > 0 ? (
        <div className="mt-3">
          <CollapsibleSection triggerLabel="Proof history">
            <LenderProofHistory
              currentSubmittedProofId={needsReview && latestProof ? latestProof.id : null}
              isReadOnly={isReadOnly}
              proofs={repayment.proofs}
            />
          </CollapsibleSection>
        </div>
      ) : null}
    </div>
  );
}

export function LoanStatusBadge({
  status,
  disbursementStatus = "received_by_borrower",
}: {
  status: string;
  disbursementStatus?: string;
}) {
  if (disbursementStatus === "awaiting_release") {
    return <ToneBadge tone="neutral">Waiting for release</ToneBadge>;
  }

  if (disbursementStatus === "released_by_lender") {
    return <ToneBadge tone="neutral">Funds released</ToneBadge>;
  }

  if (disbursementStatus === "release_disputed") {
    return <ToneBadge tone="danger">Funds disputed</ToneBadge>;
  }

  const tone = status === "overdue" ? "danger" : "success";
  return <ToneBadge tone={tone}>{status}</ToneBadge>;
}

function LenderProofHistory({
  currentSubmittedProofId,
  isReadOnly = false,
  proofs,
}: {
  currentSubmittedProofId: string | null;
  isReadOnly?: boolean;
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
          {proof.id === currentSubmittedProofId && !isReadOnly ? (
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

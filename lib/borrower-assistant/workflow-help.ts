import type { LoanApplicationsLoadResult } from "@/app/borrower/actions";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import { borrowerVerificationStatusLabels } from "@/lib/borrower-verification";
import type { BorrowerCreditSummary } from "@/lib/credit-limit";
import { formatCreditAmount } from "@/lib/credit-limit";

export function answerCompleteProfile(input: {
  result: LoanApplicationsLoadResult | null;
  readiness: BorrowerReadinessResult | null;
}) {
  if (!input.result?.hasPortfolio) {
    return "Go to Profile and complete your business profile first. After saving it, continue with borrower verification.";
  }

  const verification = input.result.borrowerVerification;

  if (input.readiness?.missingFields.length) {
    return `Update your Profile next. Missing items: ${input.readiness.missingFields
      .slice(0, 4)
      .join(", ")}.`;
  }

  if (verification && verification.status !== "approved") {
    return getVerificationAction(verification.status);
  }

  const loanConsent =
    input.result.consentStatuses?.borrowerLoanApplication ?? null;

  if (!loanConsent?.isCurrent) {
    return "Review and accept the credit review authorization before submitting a loan application.";
  }

  if (input.readiness?.nextActions.length) {
    return input.readiness.nextActions[0];
  }

  return "Your profile looks complete. You can go to Apply and submit a loan application when you are ready.";
}

export function answerApplyBlockers(input: {
  result: LoanApplicationsLoadResult | null;
  readiness: BorrowerReadinessResult | null;
  creditSummary: BorrowerCreditSummary | null;
}) {
  const blockers: string[] = [];

  if (!input.result?.hasPortfolio) {
    blockers.push("complete your business profile");
  }

  const verification = input.result?.borrowerVerification ?? null;
  if (!verification || verification.status !== "approved") {
    blockers.push("finish borrower verification and wait for approval");
  }

  const loanConsent =
    input.result?.consentStatuses?.borrowerLoanApplication ?? null;
  if (!loanConsent?.isCurrent) {
    blockers.push("accept the credit review authorization");
  }

  if (input.creditSummary && input.creditSummary.availableCredit <= 0) {
    blockers.push("free up available credit before requesting a new loan");
  }

  if (
    input.readiness &&
    input.readiness.readinessStatus !== "eligible_to_apply"
  ) {
    const nextAction = input.readiness.nextActions[0];
    blockers.push(nextAction ?? "resolve your profile readiness items");
  }

  if (blockers.length === 0) {
    return "You look ready to apply. Go to Apply, enter an amount within your available credit, and submit the application.";
  }

  return `Before you can apply, ${dedupe(blockers).slice(0, 4).join("; ")}.`;
}

export function answerCreditLimit(input: {
  creditSummary: BorrowerCreditSummary | null;
}) {
  if (!input.creditSummary) {
    return "Your credit limit is not available yet. Complete your business profile and borrower verification so LendFolio can calculate it.";
  }

  const summary = input.creditSummary;

  return `Your calculated credit limit is ${formatCreditAmount(
    summary.calculatedCreditLimit,
  )}. You are currently using ${formatCreditAmount(
    summary.usedCredit,
  )}, leaving ${formatCreditAmount(
    summary.availableCredit,
  )} available. Your safe monthly repayment capacity is ${formatCreditAmount(
    summary.safeMonthlyRepaymentCapacity,
  )}, based on your current cash flow.`;
}

function getVerificationAction(
  status: NonNullable<LoanApplicationsLoadResult["borrowerVerification"]>["status"],
) {
  const label =
    status === "missing" ? "Not started" : borrowerVerificationStatusLabels[status];

  if (status === "rejected" || status === "needs_resubmission") {
    return `Your borrower verification is ${label.toLowerCase()}. Go to Profile, update the required documents, and resubmit.`;
  }

  if (status === "submitted" || status === "under_review") {
    return "Your borrower verification is already submitted. Wait for manager review before applying.";
  }

  return `Your borrower verification is ${label.toLowerCase()}. Go to Profile and upload the required verification documents.`;
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}

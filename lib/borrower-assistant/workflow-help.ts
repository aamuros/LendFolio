import type { LoanApplicationsLoadResult } from "@/app/borrower/actions";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import { borrowerVerificationStatusLabels } from "@/lib/borrower-verification";
import type { BorrowerCreditSummary } from "@/lib/credit-limit";
import { formatCreditAmount } from "@/lib/credit-limit";
import type { BorrowerAssistantReply } from "@/lib/borrower-assistant/types";

export function answerCompleteProfile(input: {
  result: LoanApplicationsLoadResult | null;
  readiness: BorrowerReadinessResult | null;
}): BorrowerAssistantReply {
  if (!input.result?.hasPortfolio) {
    return {
      content:
        "Go to Profile and complete your business profile first. After saving it, continue with borrower verification.",
      actions: [{ type: "tab", label: "Go to Profile", tab: "profile" }],
    };
  }

  const verification = input.result.borrowerVerification;

  if (input.readiness?.missingFields.length) {
    return {
      content: `Update your Profile next. Missing items: ${input.readiness.missingFields
        .slice(0, 4)
        .join(", ")}.`,
      actions: [{ type: "tab", label: "Go to Profile", tab: "profile" }],
    };
  }

  if (verification && verification.status !== "approved") {
    return getVerificationAction(verification.status);
  }

  const loanConsent =
    input.result.consentStatuses?.borrowerLoanApplication ?? null;

  if (!loanConsent?.isCurrent) {
    return {
      content:
        "Go to Apply and accept the credit review authorization before submitting a loan application.",
      actions: [{ type: "tab", label: "Go to Apply", tab: "apply" }],
    };
  }

  if (input.readiness?.nextActions.length) {
    return {
      content: input.readiness.nextActions[0],
      actions: [{ type: "tab", label: "Go to Profile", tab: "profile" }],
    };
  }

  return {
    content:
      "Your profile looks complete. You can go to Apply and submit a loan application when you are ready.",
    actions: [{ type: "tab", label: "Go to Apply", tab: "apply" }],
  };
}

export function answerApplyBlockers(input: {
  result: LoanApplicationsLoadResult | null;
  readiness: BorrowerReadinessResult | null;
  creditSummary: BorrowerCreditSummary | null;
}): BorrowerAssistantReply {
  if (!input.result?.hasPortfolio) {
    return {
      content:
        "You need to complete your business profile before applying. Go to Profile and save the required business details.",
      actions: [{ type: "tab", label: "Go to Profile", tab: "profile" }],
    };
  }

  const verification = input.result?.borrowerVerification ?? null;
  if (!verification || verification.status !== "approved") {
    return {
      content:
        verification?.status === "submitted" || verification?.status === "under_review"
          ? "Your borrower verification is still under review. You can apply after it is approved."
          : "Borrower verification must be approved before you can apply.",
      actions: [{ type: "verification", label: "Go to verification" }],
    };
  }

  const loanConsent =
    input.result?.consentStatuses?.borrowerLoanApplication ?? null;
  if (!loanConsent?.isCurrent) {
    return {
      content:
        "You need to accept the credit review authorization before submitting a loan application.",
      actions: [{ type: "tab", label: "Go to Apply", tab: "apply" }],
    };
  }

  if (input.creditSummary && input.creditSummary.availableCredit <= 0) {
    return {
      content:
        "You do not have available credit for a new application right now. Active loans and submitted applications can use your credit limit.",
      actions: [{ type: "tab", label: "View loans", tab: "loans" }],
    };
  }

  if (
    input.readiness &&
    input.readiness.readinessStatus !== "eligible_to_apply"
  ) {
    return {
      content:
        input.readiness.nextActions[0] ??
        "Resolve your profile readiness items before applying.",
      actions: [{ type: "tab", label: "Go to Profile", tab: "profile" }],
    };
  }

  return {
    content:
      "You look ready to apply. Go to Apply, enter an amount within your available credit, and submit the application.",
    actions: [{ type: "tab", label: "Go to Apply", tab: "apply" }],
  };
}

export function answerCreditLimit(input: {
  creditSummary: BorrowerCreditSummary | null;
}): BorrowerAssistantReply {
  if (!input.creditSummary) {
    return {
      content:
        "Your credit limit is not available yet. Complete your business profile and borrower verification so LendFolio can calculate it.",
      actions: [{ type: "tab", label: "Go to Profile", tab: "profile" }],
    };
  }

  const summary = input.creditSummary;

  return {
    content: `Your calculated credit limit is ${formatCreditAmount(
      summary.calculatedCreditLimit,
    )}. You are currently using ${formatCreditAmount(
      summary.usedCredit,
    )}, leaving ${formatCreditAmount(
      summary.availableCredit,
    )} available. Your safe monthly repayment capacity is ${formatCreditAmount(
      summary.safeMonthlyRepaymentCapacity,
    )}, based on your current cash flow.`,
  };
}

function getVerificationAction(
  status: NonNullable<LoanApplicationsLoadResult["borrowerVerification"]>["status"],
): BorrowerAssistantReply {
  const label =
    status === "missing" ? "Not started" : borrowerVerificationStatusLabels[status];

  if (status === "rejected" || status === "needs_resubmission") {
    return {
      content: `Your borrower verification is ${label.toLowerCase()}. Go to Profile, update the required documents, and resubmit.`,
      actions: [{ type: "verification", label: "Go to verification" }],
    };
  }

  if (status === "submitted" || status === "under_review") {
    return {
      content:
        "Your borrower verification is already submitted. Wait for manager review before applying.",
      actions: [{ type: "verification", label: "Go to verification" }],
    };
  }

  return {
    content: `Your borrower verification is ${label.toLowerCase()}. Go to Profile and upload the required verification documents.`,
    actions: [{ type: "verification", label: "Go to verification" }],
  };
}

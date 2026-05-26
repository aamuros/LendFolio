import type { BorrowerVerificationSummary } from "@/lib/borrower-verification";
import type { ConsentStatus } from "@/lib/consents";
import {
  explainBorrowerCreditLimit,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
import type { BorrowerPortfolioInput } from "@/lib/borrower-portfolio";
import type { ProfileStatus } from "@/lib/supabase/types";

export const borrowerReadinessStatuses = [
  "incomplete",
  "complete",
  "needs_review",
  "not_eligible",
  "eligible_to_apply",
] as const;

export type BorrowerReadinessStatus =
  (typeof borrowerReadinessStatuses)[number];

export type BorrowerReadinessResult = {
  readinessStatus: BorrowerReadinessStatus;
  missingFields: string[];
  riskFlags: string[];
  monthlyNetCashFlow: number;
  debtBurdenRatio: number | null;
  profileIsStale: boolean;
  nextActions: string[];
};

export type BorrowerReadinessGateInput = {
  accountStatus?: ProfileStatus;
  borrowerVerification?: BorrowerVerificationSummary | null;
  loanApplicationConsent?: ConsentStatus | null;
  creditSummary?: BorrowerCreditSummary | null;
};

const requiredProfileFields = [
  ["businessName", "Business name"],
  ["businessDescription", "Business description"],
  ["businessType", "Business type"],
  ["startedOperatingAt", "Business start date"],
  ["businessAddress", "Business address"],
  ["barangay", "Barangay"],
  ["cityOrMunicipality", "City or municipality"],
  ["province", "Province"],
  ["operatingModel", "Operating model"],
  ["primarySalesChannel", "Primary sales channel"],
  ["revenuePeriod", "Revenue period"],
  ["revenueConfidence", "Revenue confidence"],
  ["loanPurposeContext", "Loan-use context"],
] as const satisfies ReadonlyArray<readonly [keyof BorrowerPortfolioInput, string]>;

export function evaluateBorrowerReadiness(
  portfolio: BorrowerPortfolioInput | null,
  gates: BorrowerReadinessGateInput = {},
): BorrowerReadinessResult {
  if (!portfolio) {
    return {
      readinessStatus: "incomplete",
      missingFields: requiredProfileFields.map(([, label]) => label),
      riskFlags: [],
      monthlyNetCashFlow: 0,
      debtBurdenRatio: null,
      profileIsStale: false,
      nextActions: ["Save your business profile."],
    };
  }

  const missingFields = requiredProfileFields
    .filter(([field]) => !hasValue(portfolio[field]))
    .map(([, label]) => label);
  const credit = gates.creditSummary ?? {
    ...explainBorrowerCreditLimit(portfolio),
    usedCredit: 0,
    availableCredit: explainBorrowerCreditLimit(portfolio).calculatedCreditLimit,
  };
  const monthlyNetCashFlow = credit.monthlyNetCashFlow;
  const debtBurdenRatio =
    portfolio.monthlyGrossRevenue > 0
      ? portfolio.existingLoanPayments / portfolio.monthlyGrossRevenue
      : null;
  const riskFlags = new Set<string>(credit.riskFlags);
  const profileIsStale = false;

  if (portfolio.monthlyGrossRevenue === 0) riskFlags.add("zero_revenue");
  if (portfolio.monthlyExpenses > portfolio.monthlyGrossRevenue) {
    riskFlags.add("expenses_exceed_revenue");
  }
  if (debtBurdenRatio !== null && debtBurdenRatio >= 0.4) {
    riskFlags.add("high_debt_burden");
  }
  if (portfolio.loanPurposeContext.trim().length < 40) {
    riskFlags.add("vague_loan_purpose");
  }
  if (businessAgeMonths(portfolio.startedOperatingAt) < 6) {
    riskFlags.add("very_new_business");
  }

  const blockingFlags = new Set<string>();
  if (gates.accountStatus === "suspended") blockingFlags.add("suspended");
  if (gates.accountStatus && gates.accountStatus !== "active") {
    blockingFlags.add("account_not_active");
  }
  if (monthlyNetCashFlow <= 0) blockingFlags.add("non_positive_cash_flow");
  if ((gates.creditSummary?.availableCredit ?? credit.availableCredit) <= 0) {
    blockingFlags.add("no_available_credit");
  }

  if (missingFields.length > 0) {
    return {
      readinessStatus: "incomplete",
      missingFields,
      riskFlags: [...riskFlags],
      monthlyNetCashFlow,
      debtBurdenRatio,
      profileIsStale,
      nextActions: ["Complete the missing business profile fields."],
    };
  }

  if (blockingFlags.size > 0) {
    return {
      readinessStatus: "not_eligible",
      missingFields,
      riskFlags: [...new Set([...riskFlags, ...blockingFlags])],
      monthlyNetCashFlow,
      debtBurdenRatio,
      profileIsStale,
      nextActions: ["Review your profile and account status before applying."],
    };
  }

  if (riskFlags.size > 0) {
    return {
      readinessStatus: "needs_review",
      missingFields,
      riskFlags: [...riskFlags],
      monthlyNetCashFlow,
      debtBurdenRatio,
      profileIsStale,
      nextActions: ["Request review or update the flagged profile details."],
    };
  }

  const verificationReady =
    !gates.borrowerVerification ||
    gates.borrowerVerification.status === "approved";
  const consentReady =
    !gates.loanApplicationConsent || gates.loanApplicationConsent.isCurrent;
  const eligible =
    verificationReady &&
    consentReady &&
    gates.accountStatus !== "pending" &&
    gates.accountStatus !== "suspended";

  return {
    readinessStatus: eligible ? "eligible_to_apply" : "complete",
    missingFields,
    riskFlags: [],
    monthlyNetCashFlow,
    debtBurdenRatio,
    profileIsStale,
    nextActions: eligible
      ? ["You can submit a loan application."]
      : ["Complete account, consent, and verification requirements."],
  };
}

function hasValue(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

function businessAgeMonths(value: string) {
  const startedAt = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(startedAt.getTime())) return 0;
  const now = new Date();
  return (
    (now.getUTCFullYear() - startedAt.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    startedAt.getUTCMonth()
  );
}

import {
  getBusinessProofStatus,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
import type { ConsentStatus } from "@/lib/consents";
import {
  explainBorrowerCreditLimit,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
import type { BorrowerPortfolioInput } from "@/lib/borrower-portfolio";
import {
  borrowerPortfolioSchema,
  calculateDisposableIncome,
  calculateTotalBusinessExpenses,
  calculateTotalExistingDebtPayments,
  calculateTotalHouseholdExpenses,
  getBorrowerPortfolioDefaultValues,
} from "@/lib/borrower-portfolio";
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
  applicationRetryAt?: string | null;
  applicationRetryDaysRemaining?: number;
  nextActions: string[];
};

export type BorrowerReadinessGateInput = {
  accountStatus?: ProfileStatus;
  borrowerVerification?: BorrowerVerificationSummary | null;
  loanApplicationConsent?: ConsentStatus | null;
  creditSummary?: BorrowerCreditSummary | null;
  negativeCashFlowBlockedUntil?: string | null;
};

const requiredProfileFields = [
  ["businessName", "Business name"],
  ["businessType", "Business type"],
  ["yearsInOperation", "Years in operation"],
  ["confirmsInformationTrue", "Truthfulness confirmation"],
  ["consentsToDataProcessing", "Data processing consent"],
  ["consentsToCreditCheck", "Credit check consent"],
] as const satisfies ReadonlyArray<readonly [keyof BorrowerPortfolioInput, string]>;

export function evaluateBorrowerReadiness(
  portfolio: Partial<BorrowerPortfolioInput> | null,
  gates: BorrowerReadinessGateInput = {},
): BorrowerReadinessResult {
  if (!portfolio) {
    return {
      readinessStatus: "incomplete",
      missingFields: ["Business profile"],
      riskFlags: [],
      monthlyNetCashFlow: 0,
      debtBurdenRatio: null,
      profileIsStale: false,
      applicationRetryAt: null,
      applicationRetryDaysRemaining: 0,
      nextActions: ["Save your microbusiness profile."],
    };
  }

  const parsedPortfolioResult = borrowerPortfolioSchema.safeParse({
    ...getBorrowerPortfolioDefaultValues(),
    ...portfolio,
  });

  if (!parsedPortfolioResult.success) {
    return {
      readinessStatus: "incomplete",
      missingFields: getMissingFieldsFromIssues(
        parsedPortfolioResult.error.issues,
      ),
      riskFlags: [],
      monthlyNetCashFlow: 0,
      debtBurdenRatio: null,
      profileIsStale: false,
      applicationRetryAt: null,
      applicationRetryDaysRemaining: 0,
      nextActions: ["Complete the missing microbusiness profile fields."],
    };
  }

  const parsedPortfolio = parsedPortfolioResult.data;
  const totalBusinessExpenses = calculateTotalBusinessExpenses(parsedPortfolio);
  const totalHouseholdExpenses = calculateTotalHouseholdExpenses(parsedPortfolio);
  const totalExistingDebtPayments =
    calculateTotalExistingDebtPayments(parsedPortfolio);
  const disposableIncome = calculateDisposableIncome(parsedPortfolio);
  const credit = gates.creditSummary ?? {
    ...explainBorrowerCreditLimit({
      ...parsedPortfolio,
      totalHouseholdExpenses,
      monthlyExpenses: totalBusinessExpenses,
      existingLoanPayments: totalExistingDebtPayments,
    }),
    usedCredit: 0,
    availableCredit: explainBorrowerCreditLimit({
      ...parsedPortfolio,
      totalHouseholdExpenses,
      monthlyExpenses: totalBusinessExpenses,
      existingLoanPayments: totalExistingDebtPayments,
    }).calculatedCreditLimit,
  };
  const debtBurdenRatio =
    parsedPortfolio.monthlyGrossRevenue > 0
      ? totalExistingDebtPayments / parsedPortfolio.monthlyGrossRevenue
      : null;
  const missingFields: string[] = getMissingFields(parsedPortfolio);
  const riskFlags = new Set<string>(credit.riskFlags);
  const blockingFlags = new Set<string>();
  const profileIsStale = false;
  const applicationRetryAt = getFutureDate(gates.negativeCashFlowBlockedUntil);
  const applicationRetryDaysRemaining = applicationRetryAt
    ? Math.max(1, Math.ceil((applicationRetryAt.getTime() - Date.now()) / 86_400_000))
    : 0;
  const businessProofState = getBusinessProofState(gates);
  const hasBusinessProofAccepted = businessProofState === "accepted";

  if (
    !parsedPortfolio.confirmsBusinessOperating &&
    !parsedPortfolio.businessTemporarilyStopped
  ) {
    missingFields.push("Business operating confirmation");
  } else if (parsedPortfolio.businessTemporarilyStopped) {
    blockingFlags.add("business_not_operating");
  }

  if (!hasBusinessLocation(parsedPortfolio)) missingFields.push("Business location");
  if (parsedPortfolio.monthlyGrossRevenue <= 0) {
    riskFlags.add("zero_revenue");
    blockingFlags.add("zero_revenue");
  }
  if (totalBusinessExpenses > parsedPortfolio.monthlyGrossRevenue) {
    riskFlags.add("expenses_exceed_revenue");
  }
  if (disposableIncome <= 0) {
    riskFlags.add("non_positive_cash_flow");
    blockingFlags.add("non_positive_cash_flow");
  }
  if (applicationRetryAt) {
    riskFlags.add("negative_cash_flow_cooldown");
    blockingFlags.add("negative_cash_flow_cooldown");
  }
  if (debtBurdenRatio !== null && debtBurdenRatio >= 0.4) {
    riskFlags.add("high_debt_burden");
  }
  if (parsedPortfolio.yearsInOperation < 0.5) {
    riskFlags.add("very_new_business");
  }
  if (!hasBusinessProofAccepted) {
    riskFlags.add("no_business_proof");
  }
  if (
    parsedPortfolio.revenueConfidence === "self_declared_only" &&
    !hasBusinessProofAccepted
  ) {
    riskFlags.add("self_declared_income_only");
  }
  if (
    parsedPortfolio.monthlyGrossRevenue > 0 &&
    parsedPortfolio.estimatedCustomerCreditAmount / parsedPortfolio.monthlyGrossRevenue >=
      0.25
  ) {
    riskFlags.add("high_customer_credit_exposure");
  }

  addDeclaredRiskFlags(parsedPortfolio, riskFlags);

  if (gates.accountStatus === "suspended") blockingFlags.add("suspended");
  if (gates.accountStatus && gates.accountStatus !== "active") {
    blockingFlags.add("account_not_active");
  }
  if ((gates.creditSummary?.availableCredit ?? credit.availableCredit) <= 0) {
    blockingFlags.add("no_available_credit");
  }

  if (missingFields.length > 0) {
    return {
      readinessStatus: "incomplete",
      missingFields,
      riskFlags: [...riskFlags],
      monthlyNetCashFlow: disposableIncome,
      debtBurdenRatio,
      profileIsStale,
      applicationRetryAt: applicationRetryAt?.toISOString() ?? null,
      applicationRetryDaysRemaining,
      nextActions: missingFields.map((field) => `Complete ${field} before applying.`),
    };
  }

  if (blockingFlags.size > 0) {
    return {
      readinessStatus: "not_eligible",
      missingFields,
      riskFlags: [...new Set([...riskFlags, ...blockingFlags])],
      monthlyNetCashFlow: disposableIncome,
      debtBurdenRatio,
      profileIsStale,
      applicationRetryAt: applicationRetryAt?.toISOString() ?? null,
      applicationRetryDaysRemaining,
      nextActions: getNotEligibleActions(blockingFlags, gates),
    };
  }

  if (riskFlags.size > 0) {
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
      riskFlags: [...riskFlags],
      monthlyNetCashFlow: disposableIncome,
      debtBurdenRatio,
      profileIsStale,
      applicationRetryAt: applicationRetryAt?.toISOString() ?? null,
      applicationRetryDaysRemaining,
      nextActions: [getNeedsReviewAction(riskFlags, gates)],
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
    monthlyNetCashFlow: disposableIncome,
    debtBurdenRatio,
    profileIsStale,
    applicationRetryAt: applicationRetryAt?.toISOString() ?? null,
    applicationRetryDaysRemaining,
    nextActions: eligible
      ? ["You can submit a loan application."]
      : ["Complete account, consent, and verification requirements."],
  };
}

function getMissingFields(portfolio: BorrowerPortfolioInput) {
  return requiredProfileFields
    .filter(([field]) => !hasValue(portfolio[field]))
    .map(([, label]) => label);
}

function getMissingFieldsFromIssues(
  issues: Array<{ path: PropertyKey[]; message: string }>,
) {
  const missingFields = issues.map((issue) => {
    const path = issue.path.join(".");

    return validationMissingFieldLabels[path] ?? issue.message;
  });

  return [...new Set(missingFields)];
}

const validationMissingFieldLabels: Record<string, string> = {
  mainProductsOrServicesCategory: "Main products or services",
  mainProductsOrServicesOther: "Main products or services",
  "address.regionCode": "Business region",
  "address.cityOrMunicipality": "Business city or municipality",
  "address.barangay": "Business barangay",
  streetAddress: "Business street address",
  "homeAddressSelection.regionCode": "Home address",
  "homeAddressSelection.cityOrMunicipality": "Home address",
  "homeAddressSelection.barangay": "Home address",
  homeStreetAddress: "Home street address",
};

function hasBusinessLocation(portfolio: BorrowerPortfolioInput) {
  return hasValue(portfolio.location) || hasValue(portfolio.streetAddress);
}

function hasValue(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  return value != null;
}

function addDeclaredRiskFlags(
  portfolio: BorrowerPortfolioInput,
  riskFlags: Set<string>,
) {
  if (portfolio.hasOverdueLoans) riskFlags.add("overdue_debt_declared");
  if (portfolio.missedPaymentsLast12Months) {
    riskFlags.add("missed_payments_declared");
  }
  if (portfolio.hasUnpaidLendingAppLoans) {
    riskFlags.add("unpaid_lending_app_declared");
  }
  if (portfolio.hasBouncedChecks) riskFlags.add("bounced_check_declared");
  if (portfolio.isCoMakerOrGuarantor) {
    riskFlags.add("co_maker_obligation_declared");
  }
  if (portfolio.hasDebtRelatedLegalCase) {
    riskFlags.add("debt_legal_case_declared");
  }
  if (portfolio.hasRepossessionHistory) riskFlags.add("repossession_declared");
  if (portfolio.hasTaxArrears) riskFlags.add("tax_arrears_declared");
  if (portfolio.businessTemporarilyStopped) {
    riskFlags.add("business_temporarily_closed");
  }
}

function getBusinessProofState(gates: BorrowerReadinessGateInput) {
  if (
    gates.borrowerVerification?.status === "approved" &&
    gates.borrowerVerification.documentPolicy.documentsAccepted
  ) {
    return "accepted";
  }

  return getBusinessProofStatus(gates.borrowerVerification?.documents ?? []);
}

function getNotEligibleActions(
  blockingFlags: Set<string>,
  gates: BorrowerReadinessGateInput,
) {
  const actions: string[] = [];

  if (blockingFlags.has("negative_cash_flow_cooldown")) {
    const retryAt = getFutureDate(gates.negativeCashFlowBlockedUntil);
    const days = retryAt
      ? Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 86_400_000))
      : 0;
    actions.push(
      `Your loan application is paused for ${days} more day${days === 1 ? "" : "s"}. Update and resubmit your business profile after the waiting period.`,
    );
  }

  if (blockingFlags.has("no_available_credit")) {
    actions.push(
      "You have no available credit remaining.",
    );
  }
  if (
    blockingFlags.has("non_positive_cash_flow") &&
    !blockingFlags.has("negative_cash_flow_cooldown")
  ) {
    actions.push("Monthly cash flow must be positive before applying.");
  }
  if (blockingFlags.has("zero_revenue")) {
    actions.push("Add monthly revenue before applying.");
  }
  if (blockingFlags.has("business_not_operating")) {
    actions.push("Your business must be currently operating before you can apply.");
  }
  if (blockingFlags.has("suspended")) {
    actions.push("This account is suspended.");
  } else if (blockingFlags.has("account_not_active")) {
    actions.push("This account is not active.");
  }

  return actions.length > 0
    ? actions
    : [getBusinessProofAction(gates)];
}

function getFutureDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= Date.now() ? null : date;
}

function getBusinessProofAction(gates: BorrowerReadinessGateInput) {
  const state = getBusinessProofState(gates);

  if (state === "pending") return "Business proof is under review.";
  if (state === "rejected") {
    return "Business proof was rejected. Please upload a new document.";
  }
  if (state === "accepted") return "Business proof accepted.";
  return "Next, upload your business proof so your profile can be reviewed.";
}

function getNeedsReviewAction(
  riskFlags: Set<string>,
  gates: BorrowerReadinessGateInput,
) {
  if (riskFlags.has("no_business_proof")) {
    return getBusinessProofAction(gates);
  }
  if (riskFlags.has("self_declared_income_only")) {
    return "Adding business proof can help verify your income faster.";
  }
  if (riskFlags.has("high_debt_burden")) {
    return "Review existing debt payments before applying.";
  }

  return "Your profile is ready for review. You can continue with the next step.";
}

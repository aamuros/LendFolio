import type { BorrowerVerificationSummary } from "@/lib/borrower-verification";
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
  ["businessType", "Business type"],
  ["yearsInOperation", "Years in operation"],
  ["loanPurposeContext", "Loan use context"],
  ["confirmsInformationTrue", "Truthfulness confirmation"],
  ["consentsToDataProcessing", "Data processing consent"],
  ["consentsToCreditCheck", "Credit check consent"],
  ["confirmsBusinessOperating", "Business operating confirmation"],
] as const satisfies ReadonlyArray<readonly [keyof BorrowerPortfolioInput, string]>;

const vagueLoanPurposes = new Set([
  "business",
  "personal",
  "need money",
  "expenses",
  "capital",
  "capital only",
]);

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
  if (debtBurdenRatio !== null && debtBurdenRatio >= 0.4) {
    riskFlags.add("high_debt_burden");
  }
  if (isVagueLoanPurpose(parsedPortfolio.loanPurposeContext)) {
    riskFlags.add("vague_loan_purpose");
  }
  if (parsedPortfolio.yearsInOperation < 0.5) {
    riskFlags.add("very_new_business");
  }
  if (!parsedPortfolio.hasBusinessRegistration || !hasAcceptedBusinessProof(gates)) {
    riskFlags.add("no_business_proof");
  }
  if (parsedPortfolio.revenueConfidence === "self_declared_only") {
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
      nextActions: ["Complete the missing microbusiness profile fields."],
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
      nextActions: ["Review your profile and account status before applying."],
    };
  }

  if (riskFlags.size > 0) {
    return {
      readinessStatus: "needs_review",
      missingFields,
      riskFlags: [...riskFlags],
      monthlyNetCashFlow: disposableIncome,
      debtBurdenRatio,
      profileIsStale,
      nextActions: [getNeedsReviewAction(riskFlags)],
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

function isVagueLoanPurpose(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  return (
    normalized.length < 40 ||
    vagueLoanPurposes.has(normalized) ||
    normalized.split(/\s+/).length <= 3
  );
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

function hasAcceptedBusinessProof(gates: BorrowerReadinessGateInput) {
  return Boolean(
    gates.borrowerVerification?.documentPolicy.acceptedDocumentTypes.includes(
      "business_proof",
    ),
  );
}

function getNeedsReviewAction(riskFlags: Set<string>) {
  if (riskFlags.has("vague_loan_purpose")) {
    return "Add more detail to your loan use context.";
  }
  if (riskFlags.has("self_declared_income_only")) {
    return "Upload business proof in borrower verification when available.";
  }
  if (riskFlags.has("high_debt_burden")) {
    return "Review existing debt payments before applying.";
  }
  if (riskFlags.has("no_business_proof")) {
    return "Upload at least one business proof in borrower verification.";
  }

  return "Your profile can be reviewed with the flagged details.";
}

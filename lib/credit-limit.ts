import type { ActiveLoanStatus, ApplicationStatus } from "@/lib/supabase/types";

export type CreditLimitPortfolioInput = {
  monthlyGrossRevenue: number;
  monthlyExpenses: number;
  existingLoanPayments: number;
  yearsInOperation: number;
  totalHouseholdExpenses?: number;
};

export type CreditLimitRepaymentHistoryInput = {
  cleanCompletedLoanCount?: number;
  lateRepaymentCount?: number;
  defaultedLoanCount?: number;
};

export type CreditLimitLoanInput = {
  principalAmount: number;
  outstandingBalance: number;
  status: ActiveLoanStatus;
};

export type BorrowerCreditSummary = {
  calculatedCreditLimit: number;
  usedCredit: number;
  availableCredit: number;
  monthlyNetCashFlow: number;
  safeMonthlyRepaymentCapacity: number;
  incomeBasedCapacity: number;
  repaymentHistoryCap: number;
  maximumCap: number;
  cleanCompletedLoanCount: number;
  lateRepaymentCount: number;
  defaultedLoanCount: number;
  riskFlags: string[];
};

export const creditLimitMaximum = 100_000;
export const safeRepaymentRatio = 0.3;
export const creditConsumingApplicationStatuses = [
  "submitted",
  "open",
] as const satisfies ApplicationStatus[];
export const creditConsumingActiveLoanStatuses = [
  "active",
  "overdue",
] as const satisfies ActiveLoanStatus[];

export function calculateBorrowerCreditLimit(
  portfolio: CreditLimitPortfolioInput,
  repaymentHistory: CreditLimitRepaymentHistoryInput = {},
) {
  const details = getBorrowerCreditLimitDetails(portfolio, repaymentHistory);

  return details.calculatedCreditLimit;
}

export function explainBorrowerCreditLimit(
  portfolio: CreditLimitPortfolioInput,
  repaymentHistory: CreditLimitRepaymentHistoryInput = {},
) {
  const details = getBorrowerCreditLimitDetails(portfolio, repaymentHistory);
  const riskFlags: string[] = [];
  const monthlyGrossRevenue = toFiniteNumber(portfolio.monthlyGrossRevenue);
  const monthlyExpenses = toFiniteNumber(portfolio.monthlyExpenses);
  const existingLoanPayments = toFiniteNumber(portfolio.existingLoanPayments);
  const yearsInOperation = toFiniteNumber(portfolio.yearsInOperation);

  if (details.monthlyNetCashFlow <= 0) riskFlags.push("non_positive_cash_flow");
  if (monthlyExpenses > monthlyGrossRevenue) {
    riskFlags.push("expenses_exceed_revenue");
  }
  if (monthlyGrossRevenue > 0 && existingLoanPayments / monthlyGrossRevenue >= 0.4) {
    riskFlags.push("high_existing_debt_payments");
  }
  if (yearsInOperation < 1) riskFlags.push("very_new_business");
  if (details.lateRepaymentCount > 0) riskFlags.push("late_repayment_history");
  if (details.defaultedLoanCount > 0) {
    riskFlags.push("defaulted_repayment_history");
  }

  return {
    calculatedCreditLimit: details.calculatedCreditLimit,
    monthlyNetCashFlow: details.monthlyNetCashFlow,
    safeMonthlyRepaymentCapacity: details.safeMonthlyRepaymentCapacity,
    incomeBasedCapacity: details.incomeBasedCapacity,
    repaymentHistoryCap: details.repaymentHistoryCap,
    maximumCap: creditLimitMaximum,
    cleanCompletedLoanCount: details.cleanCompletedLoanCount,
    lateRepaymentCount: details.lateRepaymentCount,
    defaultedLoanCount: details.defaultedLoanCount,
    riskFlags,
  };
}

export function calculateBorrowerAvailableCredit(input: {
  portfolio: CreditLimitPortfolioInput;
  activeLoans: CreditLimitLoanInput[];
  pendingApplicationAmounts?: number[];
  repaymentHistory?: CreditLimitRepaymentHistoryInput;
}): BorrowerCreditSummary {
  const creditLimit = explainBorrowerCreditLimit(
    input.portfolio,
    input.repaymentHistory,
  );
  const activeLoanCredit = input.activeLoans
    .filter((loan) => loanConsumesCredit(loan.status))
    .filter((loan) => loan.outstandingBalance > 0)
    .reduce((total, loan) => total + loan.principalAmount, 0);
  const pendingApplicationCredit = (input.pendingApplicationAmounts ?? []).reduce(
    (total, amount) => total + amount,
    0,
  );
  const usedCredit = activeLoanCredit + pendingApplicationCredit;

  return {
    calculatedCreditLimit: creditLimit.calculatedCreditLimit,
    usedCredit,
    availableCredit: Math.max(0, creditLimit.calculatedCreditLimit - usedCredit),
    monthlyNetCashFlow: creditLimit.monthlyNetCashFlow,
    safeMonthlyRepaymentCapacity: creditLimit.safeMonthlyRepaymentCapacity,
    incomeBasedCapacity: creditLimit.incomeBasedCapacity,
    repaymentHistoryCap: creditLimit.repaymentHistoryCap,
    maximumCap: creditLimit.maximumCap,
    cleanCompletedLoanCount: creditLimit.cleanCompletedLoanCount,
    lateRepaymentCount: creditLimit.lateRepaymentCount,
    defaultedLoanCount: creditLimit.defaultedLoanCount,
    riskFlags: creditLimit.riskFlags,
  };
}

export function applicationConsumesCredit(status: ApplicationStatus) {
  return creditConsumingApplicationStatuses.includes(
    status as (typeof creditConsumingApplicationStatuses)[number],
  );
}

export function loanConsumesCredit(status: ActiveLoanStatus) {
  return creditConsumingActiveLoanStatuses.includes(
    status as (typeof creditConsumingActiveLoanStatuses)[number],
  );
}

export function formatCreditAmount(value: number) {
  return `PHP ${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function getBorrowerCreditLimitDetails(
  portfolio: CreditLimitPortfolioInput,
  repaymentHistory: CreditLimitRepaymentHistoryInput,
) {
  const monthlyGrossRevenue = toFiniteNumber(portfolio.monthlyGrossRevenue);
  const monthlyExpenses = toFiniteNumber(portfolio.monthlyExpenses);
  const existingLoanPayments = toFiniteNumber(portfolio.existingLoanPayments);
  const cleanCompletedLoanCount = Math.max(
    0,
    Math.floor(toFiniteNumber(repaymentHistory.cleanCompletedLoanCount)),
  );
  const lateRepaymentCount = Math.max(
    0,
    Math.floor(toFiniteNumber(repaymentHistory.lateRepaymentCount)),
  );
  const defaultedLoanCount = Math.max(
    0,
    Math.floor(toFiniteNumber(repaymentHistory.defaultedLoanCount)),
  );
  const monthlyNetCashFlow =
    monthlyGrossRevenue - monthlyExpenses - existingLoanPayments;
  const safeMonthlyRepaymentCapacity = monthlyNetCashFlow * safeRepaymentRatio;
  const incomeBasedCapacity = safeMonthlyRepaymentCapacity * 3;
  const repaymentHistoryCap = getRepaymentHistoryCap({
    cleanCompletedLoanCount,
    lateRepaymentCount,
    defaultedLoanCount,
  });
  const cappedLimit = Math.min(
    incomeBasedCapacity,
    repaymentHistoryCap,
    creditLimitMaximum,
  );

  return {
    calculatedCreditLimit: Math.max(0, floorToNearest100(cappedLimit)),
    monthlyNetCashFlow,
    safeMonthlyRepaymentCapacity: Math.max(
      0,
      floorToNearest100(safeMonthlyRepaymentCapacity),
    ),
    incomeBasedCapacity: Math.max(0, floorToNearest100(incomeBasedCapacity)),
    repaymentHistoryCap,
    cleanCompletedLoanCount,
    lateRepaymentCount,
    defaultedLoanCount,
  };
}

function getRepaymentHistoryCap({
  cleanCompletedLoanCount,
  lateRepaymentCount,
  defaultedLoanCount,
}: Required<CreditLimitRepaymentHistoryInput>) {
  if (defaultedLoanCount > 0) return 0;

  const effectiveCleanLoanCount =
    lateRepaymentCount > 0
      ? Math.max(0, cleanCompletedLoanCount - 1)
      : cleanCompletedLoanCount;

  if (effectiveCleanLoanCount <= 0) return 10_000;
  if (effectiveCleanLoanCount === 1) return 15_000;
  if (effectiveCleanLoanCount === 2) return 25_000;
  if (effectiveCleanLoanCount === 3) return 40_000;
  if (effectiveCleanLoanCount <= 5) return 60_000;
  return 100_000;
}

function floorToNearest100(value: number) {
  return Math.floor(value / 100) * 100;
}

function toFiniteNumber(value: number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

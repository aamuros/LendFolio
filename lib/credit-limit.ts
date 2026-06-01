import type { ActiveLoanStatus } from "@/lib/supabase/types";

export type CreditLimitPortfolioInput = {
  monthlyGrossRevenue: number;
  monthlyExpenses: number;
  existingLoanPayments: number;
  yearsInOperation: number;
};

export type CreditLimitLoanInput = {
  outstandingBalance: number;
  status: ActiveLoanStatus;
};

export type BorrowerCreditSummary = {
  calculatedCreditLimit: number;
  usedCredit: number;
  availableCredit: number;
  monthlyNetCashFlow: number;
  baseLimit: number;
  yearsMultiplier: number;
  grossRevenueCap: number;
  maximumCap: number;
  riskFlags: string[];
};

export const creditLimitMaximum = 1_000_000;

export function calculateBorrowerCreditLimit(
  portfolio: CreditLimitPortfolioInput,
) {
  const monthlyGrossRevenue = toFiniteNumber(portfolio.monthlyGrossRevenue);
  const monthlyExpenses = toFiniteNumber(portfolio.monthlyExpenses);
  const existingLoanPayments = toFiniteNumber(portfolio.existingLoanPayments);
  const yearsInOperation = toFiniteNumber(portfolio.yearsInOperation);
  const monthlyNetCashFlow =
    monthlyGrossRevenue - monthlyExpenses - existingLoanPayments;
  const baseLimit = monthlyNetCashFlow * 3;
  const yearsMultiplier = getYearsInOperationMultiplier(yearsInOperation);
  const grossRevenueCap = monthlyGrossRevenue * 2;
  const cappedLimit = Math.min(
    baseLimit * yearsMultiplier,
    grossRevenueCap,
    creditLimitMaximum,
  );

  return Math.max(0, floorToNearest100(cappedLimit));
}

export function explainBorrowerCreditLimit(
  portfolio: CreditLimitPortfolioInput,
) {
  const monthlyGrossRevenue = toFiniteNumber(portfolio.monthlyGrossRevenue);
  const monthlyExpenses = toFiniteNumber(portfolio.monthlyExpenses);
  const existingLoanPayments = toFiniteNumber(portfolio.existingLoanPayments);
  const yearsInOperation = toFiniteNumber(portfolio.yearsInOperation);
  const monthlyNetCashFlow =
    monthlyGrossRevenue - monthlyExpenses - existingLoanPayments;
  const baseLimit = monthlyNetCashFlow * 3;
  const yearsMultiplier = getYearsInOperationMultiplier(yearsInOperation);
  const grossRevenueCap = monthlyGrossRevenue * 2;
  const calculatedCreditLimit = calculateBorrowerCreditLimit(portfolio);
  const riskFlags: string[] = [];

  if (monthlyNetCashFlow <= 0) riskFlags.push("non_positive_cash_flow");
  if (monthlyExpenses > monthlyGrossRevenue) {
    riskFlags.push("expenses_exceed_revenue");
  }
  if (existingLoanPayments > monthlyNetCashFlow * 0.4) {
    riskFlags.push("high_existing_debt_payments");
  }
  if (yearsInOperation < 1) riskFlags.push("very_new_business");

  return {
    calculatedCreditLimit,
    monthlyNetCashFlow,
    baseLimit,
    yearsMultiplier,
    grossRevenueCap,
    maximumCap: creditLimitMaximum,
    riskFlags,
  };
}

export function calculateBorrowerAvailableCredit(input: {
  portfolio: CreditLimitPortfolioInput;
  activeLoans: CreditLimitLoanInput[];
  pendingApplicationAmounts?: number[];
}): BorrowerCreditSummary {
  const creditLimit = explainBorrowerCreditLimit(input.portfolio);
  const activeLoanCredit = input.activeLoans
    .filter((loan) => loan.outstandingBalance > 0)
    .reduce((total, loan) => total + loan.outstandingBalance, 0);
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
    baseLimit: creditLimit.baseLimit,
    yearsMultiplier: creditLimit.yearsMultiplier,
    grossRevenueCap: creditLimit.grossRevenueCap,
    maximumCap: creditLimit.maximumCap,
    riskFlags: creditLimit.riskFlags,
  };
}

export function formatCreditAmount(value: number) {
  return `PHP ${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function getYearsInOperationMultiplier(yearsInOperation: number) {
  if (yearsInOperation < 1) {
    return 0.75;
  }

  if (yearsInOperation < 3) {
    return 1;
  }

  return 1.25;
}

function floorToNearest100(value: number) {
  return Math.floor(value / 100) * 100;
}

function toFiniteNumber(value: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

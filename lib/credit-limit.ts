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
};

export const creditLimitMaximum = 1_000_000;

export function calculateBorrowerCreditLimit(
  portfolio: CreditLimitPortfolioInput,
) {
  const monthlyNetCashFlow =
    portfolio.monthlyGrossRevenue -
    portfolio.monthlyExpenses -
    portfolio.existingLoanPayments;
  const baseLimit = monthlyNetCashFlow * 3;
  const yearsMultiplier = getYearsInOperationMultiplier(
    portfolio.yearsInOperation,
  );
  const grossRevenueCap = portfolio.monthlyGrossRevenue * 2;
  const cappedLimit = Math.min(
    baseLimit * yearsMultiplier,
    grossRevenueCap,
    creditLimitMaximum,
  );

  return Math.max(0, floorToNearest100(cappedLimit));
}

export function calculateBorrowerAvailableCredit(input: {
  portfolio: CreditLimitPortfolioInput;
  activeLoans: CreditLimitLoanInput[];
}): BorrowerCreditSummary {
  const calculatedCreditLimit = calculateBorrowerCreditLimit(input.portfolio);
  const usedCredit = input.activeLoans
    .filter((loan) => loan.outstandingBalance > 0)
    .reduce((total, loan) => total + loan.outstandingBalance, 0);

  return {
    calculatedCreditLimit,
    usedCredit,
    availableCredit: Math.max(0, calculatedCreditLimit - usedCredit),
    monthlyNetCashFlow:
      input.portfolio.monthlyGrossRevenue -
      input.portfolio.monthlyExpenses -
      input.portfolio.existingLoanPayments,
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

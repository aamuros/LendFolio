import { describe, expect, it } from "vitest";
import {
  applicationConsumesCredit,
  calculateBorrowerAvailableCredit,
  calculateBorrowerCreditLimit,
  exceedsAvailableCredit,
  explainBorrowerCreditLimit,
  normalizeCreditComparisonAmount,
} from "@/lib/credit-limit";

const basePortfolio = {
  monthlyGrossRevenue: 50_000,
  monthlyExpenses: 30_000,
  existingLoanPayments: 5_000,
  yearsInOperation: 2,
};

describe("borrower credit limit", () => {
  it("gives a new low-income borrower a low income-based starting limit", () => {
    const limit = calculateBorrowerCreditLimit({
      ...basePortfolio,
      monthlyGrossRevenue: 12_000,
      monthlyExpenses: 8_000,
      existingLoanPayments: 1_000,
    });

    expect(limit).toBe(2_700);
  });

  it("caps a new high-income borrower at the new borrower cap", () => {
    const summary = explainBorrowerCreditLimit({
      ...basePortfolio,
      monthlyGrossRevenue: 150_000,
      monthlyExpenses: 50_000,
      existingLoanPayments: 0,
    });

    expect(summary.incomeBasedCapacity).toBe(90_000);
    expect(summary.repaymentHistoryCap).toBe(10_000);
    expect(summary.calculatedCreditLimit).toBe(10_000);
  });

  it("does not give registered borrowers a higher limit than unregistered borrowers", () => {
    const registeredLimit = calculateBorrowerCreditLimit(basePortfolio, {
      cleanCompletedLoanCount: 2,
    });
    const unregisteredLimit = calculateBorrowerCreditLimit(basePortfolio, {
      cleanCompletedLoanCount: 2,
    });

    expect(registeredLimit).toBe(unregisteredLimit);
  });

  it("raises the repayment history cap after clean completed loans", () => {
    expect(
      explainBorrowerCreditLimit(basePortfolio, {
        cleanCompletedLoanCount: 0,
      }).repaymentHistoryCap,
    ).toBe(10_000);
    expect(
      explainBorrowerCreditLimit(basePortfolio, {
        cleanCompletedLoanCount: 1,
      }).repaymentHistoryCap,
    ).toBe(15_000);
    expect(
      explainBorrowerCreditLimit(basePortfolio, {
        cleanCompletedLoanCount: 2,
      }).repaymentHistoryCap,
    ).toBe(25_000);
    expect(
      explainBorrowerCreditLimit(basePortfolio, {
        cleanCompletedLoanCount: 3,
      }).repaymentHistoryCap,
    ).toBe(40_000);
    expect(
      explainBorrowerCreditLimit(basePortfolio, {
        cleanCompletedLoanCount: 6,
      }).repaymentHistoryCap,
    ).toBe(100_000);
  });

  it("keeps the cap based on clean completed loans when late repayments exist", () => {
    const clean = explainBorrowerCreditLimit(basePortfolio, {
      cleanCompletedLoanCount: 3,
    });
    const late = explainBorrowerCreditLimit(basePortfolio, {
      cleanCompletedLoanCount: 3,
      lateRepaymentCount: 1,
    });

    expect(clean.repaymentHistoryCap).toBe(40_000);
    expect(late.repaymentHistoryCap).toBe(40_000);
    expect(late.riskFlags).toContain("late_repayment_history");
  });

  it("sets the three clean completed loan cap to PHP 40,000", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [
        { principalAmount: 10_000, outstandingBalance: 0, status: "paid" },
        { principalAmount: 15_000, outstandingBalance: 0, status: "closed" },
        { principalAmount: 25_000, outstandingBalance: 0, status: "paid" },
      ],
      pendingApplicationAmounts: [],
      repaymentHistory: {
        cleanCompletedLoanCount: 3,
      },
    });

    expect(summary.repaymentHistoryCap).toBe(40_000);
    expect(summary.calculatedCreditLimit).toBe(40_000);
    expect(summary.usedCredit).toBe(0);
    expect(summary.availableCredit).toBe(40_000);
  });

  it("marks defaulted repayment history as not eligible for available credit", () => {
    const summary = explainBorrowerCreditLimit(basePortfolio, {
      cleanCompletedLoanCount: 6,
      defaultedLoanCount: 1,
    });

    expect(summary.repaymentHistoryCap).toBe(0);
    expect(summary.calculatedCreditLimit).toBe(0);
    expect(summary.riskFlags).toContain("defaulted_repayment_history");
  });

  it("shows no available credit when the requested amount is above available credit", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [],
      pendingApplicationAmounts: [8_000],
    });

    expect(summary.calculatedCreditLimit).toBe(10_000);
    expect(summary.availableCredit).toBe(2_000);
    expect(5_000 > summary.availableCredit).toBe(true);
  });

  it("calculates available credit from current submitted application reservations", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [],
      pendingApplicationAmounts: [3_000],
    });

    expect(summary.calculatedCreditLimit).toBe(10_000);
    expect(summary.usedCredit).toBe(3_000);
    expect(summary.availableCredit).toBe(7_000);
  });

  it("recomputes to zero after another application uses the remaining credit", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [],
      pendingApplicationAmounts: [3_000, 7_000],
    });

    expect(summary.usedCredit).toBe(10_000);
    expect(summary.availableCredit).toBe(0);
  });

  it("allows another application when active loan exposure leaves enough credit", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [
        { principalAmount: 5_000, outstandingBalance: 5_500, status: "active" },
      ],
      pendingApplicationAmounts: [],
    });

    expect(summary.calculatedCreditLimit).toBe(10_000);
    expect(summary.usedCredit).toBe(5_000);
    expect(summary.availableCredit).toBe(5_000);
    expect(3_000 <= summary.availableCredit).toBe(true);
  });

  it("blocks a new application when active loans and pending applications exhaust credit", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [
        { principalAmount: 5_000, outstandingBalance: 5_500, status: "active" },
      ],
      pendingApplicationAmounts: [3_000],
    });

    expect(summary.usedCredit).toBe(8_000);
    expect(summary.availableCredit).toBe(2_000);
    expect(3_000 > summary.availableCredit).toBe(true);
  });

  it("blocks requested amounts above current available credit", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [],
      pendingApplicationAmounts: [7_000],
    });

    expect(summary.availableCredit).toBe(3_000);
    expect(3_001 > summary.availableCredit).toBe(true);
  });

  it("allows requests exactly equal to normalized available credit", () => {
    expect(normalizeCreditComparisonAmount("25000.99")).toBe(25_000);
    expect(exceedsAvailableCredit(25_000, 25_000)).toBe(false);
    expect(exceedsAvailableCredit(24_900, 25_000)).toBe(false);
    expect(exceedsAvailableCredit(25_100, 25_000)).toBe(true);
  });

  it("allows simultaneous pending applications when total exposure fits", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [],
      pendingApplicationAmounts: [5_000],
    });

    expect(summary.usedCredit).toBe(5_000);
    expect(summary.availableCredit).toBe(5_000);
    expect(3_000 <= summary.availableCredit).toBe(true);
  });

  it("allows editing an application when the current application is excluded", () => {
    const summaryExcludingCurrentApplication = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [],
      pendingApplicationAmounts: [],
    });

    expect(summaryExcludingCurrentApplication.availableCredit).toBe(10_000);
    expect(6_000 <= summaryExcludingCurrentApplication.availableCredit).toBe(true);
  });

  it("blocks editing an application when other exposure leaves insufficient credit", () => {
    const summaryExcludingCurrentApplication = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [
        { principalAmount: 5_000, outstandingBalance: 5_500, status: "active" },
      ],
      pendingApplicationAmounts: [],
    });

    expect(summaryExcludingCurrentApplication.availableCredit).toBe(5_000);
    expect(6_000 > summaryExcludingCurrentApplication.availableCredit).toBe(true);
  });

  it("does not consume credit for closed application and loan statuses", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [
        { principalAmount: 3_000, outstandingBalance: 3_000, status: "paid" },
        { principalAmount: 3_000, outstandingBalance: 3_000, status: "defaulted" },
        { principalAmount: 3_000, outstandingBalance: 3_000, status: "closed" },
      ],
      pendingApplicationAmounts: [],
    });

    expect(summary.usedCredit).toBe(0);
    expect(summary.availableCredit).toBe(10_000);
    expect(applicationConsumesCredit("accepted")).toBe(false);
    expect(applicationConsumesCredit("declined")).toBe(false);
    expect(applicationConsumesCredit("withdrawn")).toBe(false);
  });

  it("does not consume used credit for zero-balance active loans", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [
        { principalAmount: 25_000, outstandingBalance: 0, status: "active" },
      ],
      pendingApplicationAmounts: [],
      repaymentHistory: {
        cleanCompletedLoanCount: 3,
      },
    });

    expect(summary.usedCredit).toBe(0);
    expect(summary.availableCredit).toBe(40_000);
  });

  it("does not consume used credit for fully paid loan cycles", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [{ principalAmount: 10_000, outstandingBalance: 0, status: "paid" }],
      pendingApplicationAmounts: [],
      repaymentHistory: {
        cleanCompletedLoanCount: 1,
      },
    });

    expect(summary.calculatedCreditLimit).toBe(15_000);
    expect(summary.usedCredit).toBe(0);
    expect(summary.availableCredit).toBe(15_000);
  });

  it("treats closed fully paid loan cycles as clean completed history", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [{ principalAmount: 10_000, outstandingBalance: 0, status: "closed" }],
      pendingApplicationAmounts: [],
      repaymentHistory: {
        cleanCompletedLoanCount: 1,
      },
    });

    expect(summary.repaymentHistoryCap).toBe(15_000);
    expect(summary.usedCredit).toBe(0);
    expect(summary.availableCredit).toBe(15_000);
  });

  it("consumes used credit for active and overdue loan exposure", () => {
    const summary = calculateBorrowerAvailableCredit({
      portfolio: {
        ...basePortfolio,
        monthlyGrossRevenue: 150_000,
        monthlyExpenses: 50_000,
        existingLoanPayments: 0,
      },
      activeLoans: [
        { principalAmount: 4_000, outstandingBalance: 4_400, status: "active" },
        { principalAmount: 3_000, outstandingBalance: 3_300, status: "overdue" },
        { principalAmount: 2_000, outstandingBalance: 2_200, status: "paid" },
      ],
      pendingApplicationAmounts: [],
      repaymentHistory: {
        cleanCompletedLoanCount: 1,
      },
    });

    expect(summary.calculatedCreditLimit).toBe(15_000);
    expect(summary.usedCredit).toBe(7_000);
    expect(summary.availableCredit).toBe(8_000);
  });
});

import { describe, expect, it } from "vitest";
import { getProfileStatus } from "@/components/borrower/profile/borrower-profile-hub";
import type { BorrowerPortfolioInput } from "@/lib/borrower-portfolio";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import type { BorrowerCreditSummary } from "@/lib/credit-limit";

const portfolio = {} as BorrowerPortfolioInput;

function makeReadiness(
  overrides: Partial<BorrowerReadinessResult> = {},
): BorrowerReadinessResult {
  return {
    readinessStatus: "eligible_to_apply",
    missingFields: [],
    riskFlags: [],
    monthlyNetCashFlow: 20_000,
    debtBurdenRatio: null,
    profileIsStale: false,
    nextActions: ["You can submit a loan application."],
    ...overrides,
  };
}

function makeCreditSummary(
  overrides: Partial<BorrowerCreditSummary> = {},
): BorrowerCreditSummary {
  return {
    calculatedCreditLimit: 30_000,
    usedCredit: 0,
    availableCredit: 30_000,
    monthlyNetCashFlow: 20_000,
    safeMonthlyRepaymentCapacity: 6_000,
    incomeBasedCapacity: 18_000,
    repaymentHistoryCap: 30_000,
    maximumCap: 100_000,
    cleanCompletedLoanCount: 0,
    lateRepaymentCount: 0,
    defaultedLoanCount: 0,
    riskFlags: [],
    ...overrides,
  };
}

describe("borrower profile status", () => {
  it("shows ready to apply for a complete approved borrower with available credit", () => {
    const status = getProfileStatus(
      "ready",
      portfolio,
      makeReadiness(),
      makeCreditSummary(),
      "approved",
    );

    expect(status.label).toBe("Ready to apply");
    expect(status.actionLabel).toBeNull();
  });

  it("shows credit limit reached when no available credit is the only issue", () => {
    const status = getProfileStatus(
      "ready",
      portfolio,
      makeReadiness({
        readinessStatus: "not_eligible",
        riskFlags: ["no_available_credit"],
        nextActions: ["You have no available credit remaining."],
      }),
      makeCreditSummary({ usedCredit: 30_000, availableCredit: 0 }),
      "approved",
    );

    expect(status.label).toBe("Credit limit reached");
    expect(status.title).toBe("No available credit remaining");
    expect(status.action).toBe("borrowingPower");
    expect(status.actionLabel).toBe("View borrowing power");
  });

  it("shows incomplete profile before no available credit", () => {
    const status = getProfileStatus(
      "ready",
      portfolio,
      makeReadiness({
        readinessStatus: "incomplete",
        missingFields: ["Business name"],
        riskFlags: ["no_available_credit"],
        nextActions: ["Complete Business name before applying."],
      }),
      makeCreditSummary({ usedCredit: 30_000, availableCredit: 0 }),
      "approved",
    );

    expect(status.label).toBe("Profile needs review");
    expect(status.actionLabel).toBe("Update profile details");
  });

  it("shows verification needed before no available credit", () => {
    const status = getProfileStatus(
      "ready",
      portfolio,
      makeReadiness({
        readinessStatus: "not_eligible",
        riskFlags: ["no_available_credit"],
      }),
      makeCreditSummary({ usedCredit: 30_000, availableCredit: 0 }),
      "submitted",
    );

    expect(status.label).toBe("Verification needed");
    expect(status.actionLabel).toBeNull();
  });

  it("shows profile update before no available credit for profile risk flags", () => {
    const status = getProfileStatus(
      "ready",
      portfolio,
      makeReadiness({
        readinessStatus: "not_eligible",
        riskFlags: ["self_declared_income_only", "no_available_credit"],
        nextActions: ["Adding business proof can help verify your income faster."],
      }),
      makeCreditSummary({ usedCredit: 30_000, availableCredit: 0 }),
      "approved",
    );

    expect(status.label).toBe("Profile needs update");
    expect(status.title).toBe("Review your profile");
    expect(status.actionLabel).toBe("Update profile details");
  });
});

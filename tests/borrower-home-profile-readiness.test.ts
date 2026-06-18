import { describe, expect, it } from "vitest";
import { hasProfileReadinessIssue } from "@/components/borrower-loan-application-panel";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";

function readiness(
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

describe("hasProfileReadinessIssue", () => {
  it("does not require a profile update for non-blocking needs review warnings", () => {
    expect(
      hasProfileReadinessIssue(
        readiness({
          readinessStatus: "needs_review",
          riskFlags: ["high_customer_credit_exposure"],
          nextActions: [
            "Your profile is ready for review. You can continue with the next step.",
          ],
        }),
      ),
    ).toBe(false);
  });

  it("does not require a profile update for accepted proof with self-declared revenue", () => {
    expect(
      hasProfileReadinessIssue(
        readiness({
          readinessStatus: "eligible_to_apply",
          riskFlags: [],
          missingFields: [],
        }),
      ),
    ).toBe(false);
  });

  it("requires a profile update for actual missing or blocking profile issues", () => {
    expect(
      hasProfileReadinessIssue(
        readiness({
          readinessStatus: "incomplete",
          missingFields: ["Business location"],
        }),
      ),
    ).toBe(true);

    expect(
      hasProfileReadinessIssue(
        readiness({
          readinessStatus: "not_eligible",
          riskFlags: ["non_positive_cash_flow"],
        }),
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  evaluateBorrowerCreditProfileGrade,
  formatCreditProfileGrade,
  getCreditProfileGradeLabel,
  getCreditProfileGradeSummary,
  getGradeTone,
  type CreditProfileGradeInput,
} from "@/lib/borrower-credit-profile-grade";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";

function makeReadiness(
  overrides: Partial<BorrowerReadinessResult> = {},
): BorrowerReadinessResult {
  return {
    readinessStatus: "eligible_to_apply",
    missingFields: [],
    riskFlags: [],
    monthlyNetCashFlow: 30000,
    debtBurdenRatio: 0.1,
    profileIsStale: false,
    nextActions: [],
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<CreditProfileGradeInput> = {},
): CreditProfileGradeInput {
  return {
    readiness: makeReadiness(),
    availableCredit: 100000,
    calculatedCreditLimit: 200000,
    usedCredit: 100000,
    yearsInOperation: 3,
    revenueConfidence: "document_supported",
    verificationStatus: "approved",
    ...overrides,
  };
}

describe("borrower credit profile grade", () => {
  it("returns incomplete when readiness is incomplete", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "incomplete",
          missingFields: ["Business name"],
          nextActions: ["Complete the missing business profile fields."],
        }),
      }),
    );

    expect(assessment.grade).toBe("incomplete");
    expect(assessment.positiveFactors).toHaveLength(0);
    expect(assessment.riskFactors.length).toBeGreaterThan(0);
  });

  it("returns not_eligible when readiness is not_eligible", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "not_eligible",
          monthlyNetCashFlow: -5000,
          riskFlags: ["non_positive_cash_flow"],
          nextActions: ["Review your profile and account status before applying."],
        }),
      }),
    );

    expect(assessment.grade).toBe("not_eligible");
    expect(assessment.riskFactors.length).toBeGreaterThan(0);
  });

  it("returns not_eligible when available credit is zero", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        availableCredit: 0,
      }),
    );

    expect(assessment.grade).toBe("not_eligible");
    expect(assessment.riskFactors).toContainEqual(
      expect.stringContaining("No available credit"),
    );
  });

  it("returns review_needed when readiness is needs_review", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "needs_review",
          riskFlags: ["high_debt_burden"],
          nextActions: ["Review your existing loan payments."],
        }),
      }),
    );

    expect(assessment.grade).toBe("review_needed");
    expect(assessment.riskFactors.length).toBeGreaterThan(0);
  });

  it("returns review_needed when readiness is complete (gates not met)", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "complete",
          nextActions: ["Complete account, consent, and verification requirements."],
        }),
      }),
    );

    expect(assessment.grade).toBe("review_needed");
  });

  it("returns grade A for strong eligible borrower", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "eligible_to_apply",
          monthlyNetCashFlow: 50000,
          debtBurdenRatio: 0.1,
          riskFlags: [],
        }),
        availableCredit: 200000,
        calculatedCreditLimit: 300000,
        usedCredit: 50000,
        yearsInOperation: 5,
        revenueConfidence: "document_supported",
        verificationStatus: "approved",
      }),
    );

    expect(assessment.grade).toBe("A");
    expect(assessment.positiveFactors.length).toBeGreaterThan(0);
    expect(assessment.riskFactors).toHaveLength(0);
    expect(assessment.label).toBe("Strong profile");
  });

  it("returns grade B for eligible borrower with one risk signal", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "eligible_to_apply",
          monthlyNetCashFlow: 30000,
          debtBurdenRatio: 0.35,
          riskFlags: [],
        }),
        yearsInOperation: 2,
        revenueConfidence: "document_supported",
        verificationStatus: "approved",
      }),
    );

    expect(assessment.grade).toBe("B");
    expect(assessment.riskFactors.length).toBeGreaterThan(0);
  });

  it("returns grade C for eligible borrower with multiple risk signals", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "eligible_to_apply",
          monthlyNetCashFlow: 8000,
          debtBurdenRatio: 0.35,
          riskFlags: [],
        }),
        yearsInOperation: 0.3,
        revenueConfidence: "self_declared",
        verificationStatus: "approved",
      }),
    );

    expect(assessment.grade).toBe("C");
    expect(assessment.riskFactors.length).toBeGreaterThan(1);
    expect(assessment.improvementActions.length).toBeGreaterThan(0);
  });

  it("includes explainable positive factors", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "eligible_to_apply",
          monthlyNetCashFlow: 50000,
          debtBurdenRatio: 0.1,
        }),
        yearsInOperation: 5,
        revenueConfidence: "manager_reviewed",
        verificationStatus: "approved",
      }),
    );

    expect(assessment.positiveFactors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Positive monthly net cash flow"),
      ]),
    );
    expect(assessment.positiveFactors).toEqual(
      expect.arrayContaining([expect.stringContaining("verification approved")]),
    );
    expect(assessment.positiveFactors).toEqual(
      expect.arrayContaining([expect.stringContaining("document-supported")]),
    );
    expect(assessment.positiveFactors).toEqual(
      expect.arrayContaining([expect.stringContaining("2+ years")]),
    );
  });

  it("includes explainable risk factors for self-declared revenue", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "eligible_to_apply",
          monthlyNetCashFlow: 20000,
          debtBurdenRatio: 0.15,
        }),
        yearsInOperation: 2,
        revenueConfidence: "self_declared",
        verificationStatus: "approved",
      }),
    );

    expect(assessment.riskFactors).toEqual(
      expect.arrayContaining([expect.stringContaining("self-declared")]),
    );
    expect(assessment.improvementActions).toEqual(
      expect.arrayContaining([expect.stringContaining("supporting documents")]),
    );
  });

  it("flags stale profile as risk factor in review_needed assessment", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "needs_review",
          profileIsStale: true,
          riskFlags: ["stale_profile"],
          nextActions: ["Confirm your current business profile before applying."],
        }),
      }),
    );

    expect(assessment.grade).toBe("review_needed");
    expect(assessment.riskFactors).toEqual(
      expect.arrayContaining([expect.stringContaining("not been confirmed recently")]),
    );
  });

  it("flags high credit utilization as risk factor", () => {
    const assessment = evaluateBorrowerCreditProfileGrade(
      makeInput({
        readiness: makeReadiness({
          readinessStatus: "eligible_to_apply",
          monthlyNetCashFlow: 30000,
          debtBurdenRatio: 0.1,
        }),
        availableCredit: 30000,
        calculatedCreditLimit: 200000,
        usedCredit: 170000,
        yearsInOperation: 3,
        revenueConfidence: "document_supported",
        verificationStatus: "approved",
      }),
    );

    expect(assessment.riskFactors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Used credit is consuming"),
      ]),
    );
  });
});

describe("formatCreditProfileGrade", () => {
  it("formats letter grades as 'Grade X'", () => {
    expect(formatCreditProfileGrade("A")).toBe("Grade A");
    expect(formatCreditProfileGrade("B")).toBe("Grade B");
    expect(formatCreditProfileGrade("C")).toBe("Grade C");
  });

  it("formats non-letter grades as readable text", () => {
    expect(formatCreditProfileGrade("review_needed")).toBe("Review Needed");
    expect(formatCreditProfileGrade("not_eligible")).toBe("Not Eligible");
    expect(formatCreditProfileGrade("incomplete")).toBe("Incomplete");
  });
});

describe("getGradeTone", () => {
  it("returns success for A", () => {
    expect(getGradeTone("A")).toBe("success");
  });

  it("returns attention for B and review_needed", () => {
    expect(getGradeTone("B")).toBe("attention");
    expect(getGradeTone("review_needed")).toBe("attention");
  });

  it("returns danger for C and not_eligible", () => {
    expect(getGradeTone("C")).toBe("danger");
    expect(getGradeTone("not_eligible")).toBe("danger");
  });

  it("returns neutral for incomplete", () => {
    expect(getGradeTone("incomplete")).toBe("neutral");
  });
});

describe("getCreditProfileGradeLabel", () => {
  it("returns labels for all grades", () => {
    expect(getCreditProfileGradeLabel("A")).toBe("Strong profile");
    expect(getCreditProfileGradeLabel("B")).toBe("Acceptable profile");
    expect(getCreditProfileGradeLabel("C")).toBe("Review recommended");
    expect(getCreditProfileGradeLabel("review_needed")).toBe("Review needed");
    expect(getCreditProfileGradeLabel("not_eligible")).toBe("Not eligible");
    expect(getCreditProfileGradeLabel("incomplete")).toBe("Incomplete profile");
  });
});

describe("getCreditProfileGradeSummary", () => {
  it("returns summaries for all grades", () => {
    const grades = [
      "A",
      "B",
      "C",
      "review_needed",
      "not_eligible",
      "incomplete",
    ] as const;

    for (const grade of grades) {
      const summary = getCreditProfileGradeSummary(grade);

      expect(summary).toBeTruthy();
      expect(summary.length).toBeGreaterThan(10);
    }
  });
});

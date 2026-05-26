import { describe, expect, it } from "vitest";
import { borrowerPortfolioSchema } from "@/lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "@/lib/borrower-readiness";

const completeProfile = {
  businessName: "Aling Nena Store",
  businessType: "sari_sari_store",
  location: "San Jose, Quezon City",
  monthlyGrossRevenue: 80000,
  monthlyExpenses: 45000,
  existingLoanPayments: 5000,
  yearsInOperation: 2,
  loanPurposeContext: "Additional inventory for the next month of operations.",
} as const;

describe("borrower profile validation and readiness", () => {
  it("accepts the simplified essential borrower profile fields", () => {
    const parsed = borrowerPortfolioSchema.safeParse(completeProfile);

    expect(parsed.success).toBe(true);
  });

  it("does not require the removed first-pass profile fields", () => {
    const parsed = borrowerPortfolioSchema.safeParse({
      businessName: "Aling Nena Store",
      businessType: "sari_sari_store",
      location: "San Jose, Quezon City",
      monthlyGrossRevenue: 80000,
      monthlyExpenses: 45000,
      existingLoanPayments: 5000,
      yearsInOperation: 2,
      loanPurposeContext: "Additional inventory for the next month of operations.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects negative financial values", () => {
    const parsed = borrowerPortfolioSchema.safeParse({
      ...completeProfile,
      monthlyGrossRevenue: -1,
    });

    expect(parsed.success).toBe(false);
  });

  it("marks missing production fields as incomplete", () => {
    const readiness = evaluateBorrowerReadiness({
      ...completeProfile,
      businessName: "",
    });

    expect(readiness.readinessStatus).toBe("incomplete");
    expect(readiness.missingFields).toContain("Business name");
  });

  it("flags expenses greater than revenue for review", () => {
    const readiness = evaluateBorrowerReadiness({
      ...completeProfile,
      monthlyGrossRevenue: 50000,
      monthlyExpenses: 60000,
    });

    expect(readiness.readinessStatus).toBe("not_eligible");
    expect(readiness.riskFlags).toContain("expenses_exceed_revenue");
  });

  it("blocks zero revenue readiness", () => {
    const readiness = evaluateBorrowerReadiness({
      ...completeProfile,
      monthlyGrossRevenue: 0,
    });

    expect(readiness.readinessStatus).toBe("not_eligible");
    expect(readiness.riskFlags).toContain("zero_revenue");
  });

  it("flags high debt burden for review", () => {
    const readiness = evaluateBorrowerReadiness({
      ...completeProfile,
      existingLoanPayments: 33000,
    });

    expect(readiness.readinessStatus).toBe("needs_review");
    expect(readiness.riskFlags).toContain("high_debt_burden");
  });

  it("returns eligible when profile and gates are complete", () => {
    const readiness = evaluateBorrowerReadiness(completeProfile, {
      accountStatus: "active",
      borrowerVerification: {
        id: "verification-1",
        status: "approved",
        documents: [],
        documentPolicy: {
          requiredDocumentTypes: [],
          missingRequiredDocumentTypes: [],
          submittedDocumentTypes: [],
          acceptedDocumentTypes: [],
          rejectedDocumentTypes: [],
          readyForManagerReview: true,
          documentsAccepted: true,
        },
        submittedAt: null,
        reviewedAt: null,
        managerReviewNotes: null,
        rejectionReason: null,
      },
      loanApplicationConsent: {
        scope: "borrower_loan_application",
        isCurrent: true,
        required: [],
        missing: [],
        accepted: [],
      },
    });

    expect(readiness.readinessStatus).toBe("eligible_to_apply");
  });
});

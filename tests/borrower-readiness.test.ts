import { describe, expect, it } from "vitest";
import { borrowerPortfolioSchema } from "@/lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "@/lib/borrower-readiness";

const completeProfile = {
  businessName: "Aling Nena Store",
  businessDescription: "Neighborhood retail store selling daily grocery items.",
  businessType: "sari_sari_store",
  startedOperatingAt: "2024-01-01",
  businessAddress: "12 Mabini Street",
  barangay: "San Jose",
  cityOrMunicipality: "Quezon City",
  province: "Metro Manila",
  location: "San Jose, Quezon City",
  operatingModel: "fixed_store",
  primarySalesChannel: "walk_in",
  revenuePeriod: "average_monthly_last_3_months",
  revenueConfidence: "partially_documented",
  monthlyGrossRevenue: 80000,
  monthlyExpenses: 45000,
  existingLoanPayments: 5000,
  yearsInOperation: 2,
  inventoryExpense: 30000,
  rentExpense: 8000,
  payrollExpense: 4000,
  utilitiesExpense: 2000,
  otherExpense: 1000,
  debtLenderCount: 1,
  totalOutstandingDebt: 20000,
  debtNotes: "",
  loanPurposeContext: "Additional inventory for the next month of operations.",
} as const;

describe("borrower profile validation and readiness", () => {
  it("rejects a future business start date", () => {
    const parsed = borrowerPortfolioSchema.safeParse({
      ...completeProfile,
      startedOperatingAt: "2999-01-01",
    });

    expect(parsed.success).toBe(false);
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

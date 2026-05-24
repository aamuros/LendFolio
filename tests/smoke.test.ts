import { describe, expect, it } from "vitest";
import { borrowerPortfolioSchema } from "../lib/borrower-portfolio";
import { loanApplicationSchema } from "../lib/loan-application";
import { loanOfferSchema, mapLoanOfferRow } from "../lib/loan-offer";

describe("Sprint 0 foundation", () => {
  it("names the product", () => {
    expect("LendFolio").toBe("LendFolio");
  });
});

describe("ADI-9 borrower portfolio schema", () => {
  it("accepts the MVP borrower portfolio fields", () => {
    const result = borrowerPortfolioSchema.safeParse({
      businessType: "sari_sari_store",
      location: "Quezon City",
      monthlyGrossRevenue: 45_000,
      monthlyExpenses: 28_000,
      existingLoanPayments: 3_500,
      yearsInOperation: 2,
      loanPurposeContext:
        "Additional working capital for inventory before the holiday season.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects incomplete loan purpose context", () => {
    const result = borrowerPortfolioSchema.safeParse({
      businessType: "food_stall",
      location: "Cebu City",
      monthlyGrossRevenue: 20_000,
      monthlyExpenses: 15_000,
      existingLoanPayments: 0,
      yearsInOperation: 1,
      loanPurposeContext: "Inventory",
    });

    expect(result.success).toBe(false);
  });
});

describe("ADI-10 loan application schema", () => {
  it("accepts the Sprint 1 loan application fields", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 25_000,
      purpose: "Inventory restock",
      preferredTerm: "3_months",
      remarks: "Best reviewed after the saved portfolio cash-flow fields.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid requested amount", () => {
    const result = loanApplicationSchema.safeParse({
      requestedAmount: 500,
      purpose: "Inventory restock",
      preferredTerm: "3_months",
      remarks: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("ADI-12 loan offer schema", () => {
  it("accepts the Sprint 1 pending offer fields", () => {
    const result = loanOfferSchema.safeParse({
      approvedAmount: 20_000,
      repaymentAmount: 22_000,
      fees: 500,
      dueDate: "2026-07-24",
      remarks: "Offer is based on submitted portfolio cash flow.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects repayment below approved amount", () => {
    const result = loanOfferSchema.safeParse({
      approvedAmount: 20_000,
      repaymentAmount: 19_000,
      fees: 0,
      dueDate: "2026-07-24",
      remarks: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("ADI-13 borrower offer acceptance", () => {
  it("maps accepted and declined offer statuses for borrower review", () => {
    const baseOffer = {
      id: "offer-1",
      loan_application_id: "application-1",
      borrower_id: "borrower-1",
      lender_id: "lender-1",
      lender_name: "Lender Demo",
      approved_amount: 20_000,
      repayment_amount: 22_000,
      fees: 500,
      due_date: "2026-07-24",
      remarks: "Offer is based on submitted portfolio cash flow.",
      sent_at: "2026-05-24T08:00:00.000Z",
      created_at: "2026-05-24T08:00:00.000Z",
      updated_at: "2026-05-24T08:00:00.000Z",
    };

    expect(mapLoanOfferRow({ ...baseOffer, status: "accepted" })).toMatchObject({
      applicationId: "application-1",
      lenderName: "Lender Demo",
      status: "accepted",
    });
    expect(mapLoanOfferRow({ ...baseOffer, status: "declined" })).toMatchObject({
      status: "declined",
    });
  });
});

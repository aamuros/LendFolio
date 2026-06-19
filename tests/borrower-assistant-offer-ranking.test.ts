import { describe, expect, it } from "vitest";
import type { BorrowerLoanApplicationSummary } from "@/app/borrower/actions";
import { answerOfferComparison } from "@/lib/borrower-assistant/offer-ranking";
import type { LoanOfferSummary } from "@/lib/loan-offer";

function offer(overrides: Partial<LoanOfferSummary>): LoanOfferSummary {
  return {
    id: "offer-1",
    applicationId: "application-1",
    lenderId: "lender-1",
    lenderName: "Oliver Lending Corp",
    approvedAmount: 15_000,
    principalAmount: 15_000,
    totalRepaymentAmount: 16_500,
    fees: 0,
    processingFee: 0,
    processingFeeRate: 0.02,
    interestAmount: 1_500,
    interestServiceChargeRate: 10,
    dueDate: "2026-07-18",
    remarks: null,
    status: "pending",
    sentAt: "2026-06-18T00:00:00Z",
    repaymentChannel: "GCash",
    repaymentAccountName: "Oliver Lending Corp",
    repaymentAccountNumber: "09170000000",
    repaymentInstructions: null,
    ...overrides,
  };
}

function application(
  offers: LoanOfferSummary[],
): BorrowerLoanApplicationSummary {
  return {
    id: "application-1",
    requestedAmount: 15_000,
    creditLimitAtSubmission: 25_000,
    usedCreditAtSubmission: 0,
    availableCreditAtSubmission: 25_000,
    monthlyNetCashFlowAtSubmission: 20_000,
    creditReadinessStatus: "eligible_to_apply",
    borrowerProfileSnapshot: null,
    borrowerReadinessSnapshot: null,
    creditProfileGrade: null,
    creditProfileAssessment: null,
    creditProfileAssessmentSource: null,
    purpose: "Inventory purchase",
    preferredTerm: "1_month",
    remarks: null,
    status: "submitted",
    submittedAt: "2026-06-18T00:00:00Z",
    borrowerRemovedAt: null,
    offers,
    activeLoan: null,
  };
}

describe("answerOfferComparison", () => {
  it("reports tied strongest offers when all cost ranking fields match", () => {
    const reply = answerOfferComparison({
      applications: [
        application([
          offer({ id: "offer-1", lenderName: "Oliver Lending Corp" }),
          offer({
            id: "offer-2",
            lenderId: "lender-2",
            lenderName: "Jumawid Lendocratic",
          }),
        ]),
      ],
    });

    expect(reply.content).toContain(
      "Oliver Lending Corp and Jumawid Lendocratic are tied",
    );
    expect(reply.content).toContain(
      "same total repayment, service charge rate, fees, and due date",
    );
    expect(reply.content).not.toContain(
      "Oliver Lending Corp is the strongest pending offer",
    );
  });

  it("recommends the lower total repayment offer when costs differ", () => {
    const reply = answerOfferComparison({
      applications: [
        application([
          offer({ id: "offer-1", lenderName: "Oliver Lending Corp" }),
          offer({
            id: "offer-2",
            lenderId: "lender-2",
            lenderName: "Jumawid Lendocratic",
            totalRepaymentAmount: 16_000,
            interestAmount: 1_000,
          }),
        ]),
      ],
    });

    expect(reply.content).toContain(
      "Jumawid Lendocratic is the strongest pending offer by cost",
    );
  });
});

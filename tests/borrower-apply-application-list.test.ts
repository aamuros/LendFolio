import { describe, expect, it } from "vitest";
import {
  getVisibleApplyApplications,
} from "@/components/borrower-loan-application-panel";
import type { BorrowerLoanApplicationSummary } from "@/app/borrower/actions";

function application(
  id: string,
  status: BorrowerLoanApplicationSummary["status"],
  activeLoan: BorrowerLoanApplicationSummary["activeLoan"] = null,
): BorrowerLoanApplicationSummary {
  return {
    id,
    requestedAmount: 10000,
    creditLimitAtSubmission: 20000,
    usedCreditAtSubmission: 0,
    availableCreditAtSubmission: 20000,
    monthlyNetCashFlowAtSubmission: 5000,
    creditReadinessStatus: "eligible_to_apply",
    borrowerProfileSnapshot: {},
    borrowerReadinessSnapshot: {},
    creditProfileGrade: null,
    creditProfileAssessment: null,
    creditProfileAssessmentSource: null,
    purpose: "Working capital",
    preferredTerm: "3_months",
    remarks: null,
    status,
    submittedAt: "2026-06-18T00:00:00.000Z",
    borrowerRemovedAt: null,
    offers: [],
    activeLoan,
  };
}

describe("getVisibleApplyApplications", () => {
  it("keeps only submitted and open applications for the Apply list", () => {
    const acceptedWithLoan = application("accepted", "accepted", {
      id: "loan-1",
      applicationId: "accepted",
      acceptedOfferId: "offer-1",
      borrowerId: "borrower-1",
      lenderId: "lender-1",
      principalAmount: 10000,
      repaymentAmount: 11200,
      fees: 0,
      interestAmount: 1200,
      outstandingBalance: 10000,
      totalRepaymentAmount: 11200,
      status: "active",
      startedAt: "2026-06-18T00:00:00.000Z",
      dueDate: "2026-09-18T00:00:00.000Z",
      repaymentChannel: null,
      repaymentAccountName: null,
      repaymentAccountNumber: null,
      repaymentInstructions: null,
      additionalRepaymentChannels: [],
      schedule: [],
    });
    const applications = [
      application("submitted", "submitted"),
      application("open", "open"),
      acceptedWithLoan,
      application("declined", "declined"),
      application("withdrawn", "withdrawn"),
    ];

    const visibleApplications = getVisibleApplyApplications(applications);

    expect(visibleApplications.map((item) => item.id)).toEqual([
      "submitted",
      "open",
    ]);
    expect(applications.find((item) => item.id === "accepted")?.activeLoan).toBe(
      acceptedWithLoan.activeLoan,
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  calculatePlatformProcessingFee,
  deriveInterestAmount,
  loanOfferSchema,
  PLATFORM_PROCESSING_FEE_RATE,
} from "@/lib/loan-offer";

describe("loan offer processing fee", () => {
  it("deducts the system processing fee from release instead of repayment", () => {
    const parsed = loanOfferSchema.parse({
      approvedAmount: 10_000,
      interestServiceChargeRate: 10,
      fees: 0,
      dueDate: "2099-01-01",
      remarks: "",
      repaymentChannel: "GCash",
      repaymentAccountName: "Lender",
      repaymentAccountNumber: "09170000000",
      repaymentInstructions: "",
    });

    expect(PLATFORM_PROCESSING_FEE_RATE).toBe(0.02);
    expect(parsed.processingFee).toBe(200);
    expect(parsed.repaymentAmount).toBe(11_000);
    expect(parsed.approvedAmount - parsed.processingFee).toBe(9_800);
  });

  it("calculates processing fee from approved principal only", () => {
    expect(calculatePlatformProcessingFee(10_000)).toBe(200);
    expect(calculatePlatformProcessingFee(10_000.25)).toBe(200.01);
  });

  it("derives interest without treating the processing fee as repayment", () => {
    expect(
      deriveInterestAmount({
        principalAmount: 10_000,
        repaymentAmount: 11_000,
        fees: 0,
      }),
    ).toBe(1_000);
  });
});

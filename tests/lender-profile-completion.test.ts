import { describe, expect, it } from "vitest";
import {
  getLenderProfileCompletion,
  getLenderProfileCompletionMessage,
} from "../lib/lender-profile-completion";

describe("lender profile completion", () => {
  it("requires organization, contact, address, area, loan range, and repayment terms", () => {
    const completion = getLenderProfileCompletion({
      contact_person: "",
      phone_number: "",
      operating_area: "",
      min_loan_amount: null,
      max_loan_amount: null,
    });

    expect(completion.complete).toBe(false);
    expect(completion.missingFields).toEqual([
      "organization",
      "contact person",
      "phone number",
      "address",
      "area",
      "loan range",
      "repayment terms",
    ]);
    expect(getLenderProfileCompletionMessage(completion)).toContain(
      "Action needed",
    );
  });

  it("accepts complete required lender details", () => {
    const completion = getLenderProfileCompletion({
      organizationName: "Juan Lending Co.",
      contactPerson: "Juan Dela Cruz",
      phoneNumber: "+63 917 000 0000",
      businessAddress: "123 Mabini Street, Manila",
      operatingArea: "NCR",
      minLoanAmount: 5000,
      maxLoanAmount: 50000,
      typicalRepaymentTerms: "1 to 3 months",
    });

    expect(completion.complete).toBe(true);
    expect(completion.missingFields).toEqual([]);
    expect(getLenderProfileCompletionMessage(completion)).toBe(
      "Profile details complete.",
    );
  });

  it("rejects a maximum loan amount below the minimum", () => {
    const completion = getLenderProfileCompletion({
      organizationName: "Juan Lending Co.",
      contactPerson: "Juan Dela Cruz",
      phoneNumber: "+63 917 000 0000",
      businessAddress: "123 Mabini Street, Manila",
      operatingArea: "Cebu",
      minLoanAmount: 50000,
      maxLoanAmount: 5000,
      typicalRepaymentTerms: "1 to 3 months",
    });

    expect(completion.complete).toBe(false);
    expect(completion.missingFields).toEqual(["loan range"]);
  });
});

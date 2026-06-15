import { describe, expect, it } from "vitest";
import {
  getLenderProfileCompletion,
  getLenderProfileCompletionMessage,
} from "../lib/lender-profile-completion";

describe("lender profile completion", () => {
  it("requires contact, lending area, and a valid loan range", () => {
    const completion = getLenderProfileCompletion({
      contact_person: "",
      phone_number: "",
      operating_area: "",
      min_loan_amount: null,
      max_loan_amount: null,
    });

    expect(completion.complete).toBe(false);
    expect(completion.missingFields).toEqual(["contact", "area", "loan range"]);
    expect(getLenderProfileCompletionMessage(completion)).toContain(
      "Action needed",
    );
  });

  it("accepts phone contact with a valid area and loan range", () => {
    const completion = getLenderProfileCompletion({
      phoneNumber: "+63 917 000 0000",
      operatingArea: "NCR",
      minLoanAmount: 5000,
      maxLoanAmount: 50000,
    });

    expect(completion.complete).toBe(true);
    expect(completion.missingFields).toEqual([]);
    expect(getLenderProfileCompletionMessage(completion)).toBe(
      "Profile details complete.",
    );
  });

  it("rejects a maximum loan amount below the minimum", () => {
    const completion = getLenderProfileCompletion({
      contactPerson: "Juan Dela Cruz",
      operatingArea: "Cebu",
      minLoanAmount: 50000,
      maxLoanAmount: 5000,
    });

    expect(completion.complete).toBe(false);
    expect(completion.missingFields).toEqual(["loan range"]);
  });
});

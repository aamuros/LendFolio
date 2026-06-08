import { describe, expect, it } from "vitest";
import {
  getBorrowerPortfolioDefaultValues,
  getBusinessProfileSectionStep,
  getNextBorrowerPortfolioStep,
  mergeBorrowerPortfolioSectionValues,
} from "@/lib/borrower-portfolio";

describe("borrower business profile flow", () => {
  it("advances completion saves through the next profile step", () => {
    expect(getNextBorrowerPortfolioStep("businessBasics")).toBe(
      "businessAddress",
    );
    expect(getNextBorrowerPortfolioStep("businessAddress")).toBe(
      "businessOperations",
    );
    expect(getNextBorrowerPortfolioStep("review")).toBeNull();
  });

  it("maps each business profile edit section to a single form step", () => {
    expect(getBusinessProfileSectionStep("basic")).toBe("businessBasics");
    expect(getBusinessProfileSectionStep("address")).toBe("businessAddress");
    expect(getBusinessProfileSectionStep("operations")).toBe("businessBasics");
    expect(getBusinessProfileSectionStep("products")).toBe("businessBasics");
    expect(getBusinessProfileSectionStep("records")).toBe("businessBasics");
    expect(getBusinessProfileSectionStep("loanUse")).toBe("loanUse");
  });

  it("merges a partial section update without clearing existing profile fields", () => {
    const existing = {
      ...getBorrowerPortfolioDefaultValues(),
      businessName: "Aling Nena Sari-Sari Store",
      businessType: "sari_sari_store" as const,
      location: "Diliman, Quezon City",
      mainSuppliers: "Local wholesaler",
      keepsSalesRecords: true,
      usesBankOrEwallet: true,
      loanPurposeContext: "Additional inventory for the next month.",
    };

    const merged = mergeBorrowerPortfolioSectionValues(existing, {
      primarySalesChannel: "online_orders",
      numberOfEmployees: 2,
    });

    expect(merged.primarySalesChannel).toBe("online_orders");
    expect(merged.numberOfEmployees).toBe(2);
    expect(merged.businessName).toBe("Aling Nena Sari-Sari Store");
    expect(merged.mainSuppliers).toBe("Local wholesaler");
    expect(merged.keepsSalesRecords).toBe(true);
    expect(merged.usesBankOrEwallet).toBe(true);
    expect(merged.loanPurposeContext).toBe(
      "Additional inventory for the next month.",
    );
  });
});

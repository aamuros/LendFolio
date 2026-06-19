import { describe, expect, it } from "vitest";
import {
  getCompletedBorrowerPortfolioSteps,
  getBorrowerPortfolioDefaultValues,
  getBusinessProfileSectionStep,
  getNextIncompleteBorrowerPortfolioStep,
  getNextBorrowerPortfolioStep,
  mergeBorrowerPortfolioSectionValues,
} from "@/lib/borrower-portfolio";

function profileCompleteThroughAssets(overrides = {}) {
  return {
    ...getBorrowerPortfolioDefaultValues(),
    mobileNumber: "09171234567",
    yearsAtCurrentAddress: 2,
    emergencyContactName: "Ana Santos",
    emergencyContactNumber: "09170000000",
    emergencyContactRelationship: "Sister",
    homeAddressSelection: {
      regionCode: "NCR",
      regionName: "NCR - National Capital Region",
      cityOrMunicipality: "Quezon City",
      barangay: "Diliman",
      zipCode: "1100",
    },
    homeStreetAddress: "123 Maginhawa Street",
    businessName: "Aling Nena Sari-Sari Store",
    businessType: "sari_sari_store" as const,
    address: {
      regionCode: "NCR",
      regionName: "NCR - National Capital Region",
      cityOrMunicipality: "Quezon City",
      barangay: "Diliman",
      zipCode: "1100",
    },
    streetAddress: "45 Market Road",
    ownershipType: "sole_proprietor" as const,
    borrowerRole: "owner_proprietor" as const,
    yearsInOperation: 2,
    operatingModel: "physical_store" as const,
    primarySalesChannel: "walk_in_customers" as const,
    businessSchedule: "daily" as const,
    mainProductsOrServicesCategory: "groceries_household_items" as const,
    mainSuppliers: "Local wholesaler",
    keepsSalesRecords: true,
    usesBankOrEwallet: true,
    averageDailySales: 2_500,
    averageWeeklySales: 15_000,
    monthlyGrossRevenue: 75_000,
    revenueConfidence: "sales_records" as const,
    monthlyInventoryCost: 25_000,
    monthlyBusinessRent: 5_000,
    monthlyBusinessElectricity: 2_000,
    monthlyBusinessWater: 500,
    monthlySupplierCreditPayment: 1_000,
    monthlyExpenses: 33_500,
    businessExpensesCompleted: true,
    monthlyRentOrMortgage: 6_000,
    monthlyElectricityBill: 2_000,
    monthlyWaterBill: 500,
    monthlyInternetPhoneBill: 1_000,
    monthlyFoodGroceries: 8_000,
    monthlyTransportation: 1_500,
    householdExpensesCompleted: true,
    existingDebtDeclarationCompleted: true,
    hasInventory: false,
    assetDeclarationCompleted: true,
    ...overrides,
  };
}

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

  it("starts profile completion at the first missing required step", () => {
    const incompleteProfile = {
      ...getBorrowerPortfolioDefaultValues(),
      mobileNumber: "09171234567",
      yearsAtCurrentAddress: 2,
      emergencyContactName: "Ana Santos",
      emergencyContactNumber: "09170000000",
      emergencyContactRelationship: "Sister",
      homeAddressSelection: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "Diliman",
        zipCode: "1100",
      },
      homeStreetAddress: "123 Maginhawa Street",
      businessName: "Aling Nena Sari-Sari Store",
      businessType: "sari_sari_store" as const,
      ownershipType: "sole_proprietor" as const,
      borrowerRole: "owner_proprietor" as const,
      yearsInOperation: 2,
      operatingModel: "physical_store" as const,
      primarySalesChannel: "walk_in_customers" as const,
      businessSchedule: "daily" as const,
      mainProductsOrServicesCategory: "groceries_household_items" as const,
      mainSuppliers: "Local wholesaler",
      keepsSalesRecords: true,
      usesBankOrEwallet: true,
    };

    expect(getNextIncompleteBorrowerPortfolioStep(incompleteProfile)).toBe(
      "businessAddress",
    );
  });

  it("does not mark loan use complete for a fresh default profile", () => {
    expect(
      getCompletedBorrowerPortfolioSteps(getBorrowerPortfolioDefaultValues()),
    ).not.toContain("loanUse");
  });

  it("requires the saved loan request flag before loan use is complete", () => {
    const profile = profileCompleteThroughAssets({
      loanPurposeContext: "",
      loanRequestCompleted: false,
    });

    expect(getCompletedBorrowerPortfolioSteps(profile)).not.toContain(
      "loanUse",
    );
    expect(getNextIncompleteBorrowerPortfolioStep(profile)).toBe("loanUse");
  });

  it("marks loan use complete after the loan request step is saved", () => {
    const profile = profileCompleteThroughAssets({
      loanPurposeContext: "",
      loanRequestCompleted: true,
    });

    expect(getCompletedBorrowerPortfolioSteps(profile)).toContain("loanUse");
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

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  borrowerBusinessOperationsSchema,
  borrowerPortfolioSchema,
  calculateDisposableIncome,
  calculateTotalBusinessExpenses,
  calculateTotalExistingDebtPayments,
  calculateTotalHouseholdExpenses,
  getBorrowerPortfolioDefaultValues,
  mapBorrowerPortfolioRow,
} from "@/lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "@/lib/borrower-readiness";

function completeProfile(overrides = {}) {
  return borrowerPortfolioSchema.parse({
    ...getBorrowerPortfolioDefaultValues(),
    businessName: "Aling Nena Sari-Sari Store",
    businessType: "sari_sari_store",
    location: "Diliman, Quezon City",
    address: {
      regionCode: "NCR",
      regionName: "NCR - National Capital Region",
      cityOrMunicipality: "Quezon City",
      barangay: "Diliman",
      zipCode: "1100",
    },
    ownershipType: "sole_proprietor",
    borrowerRole: "owner_proprietor",
    yearsInOperation: 2,
    operatingModel: "physical_store",
    primarySalesChannel: "walk_in_customers",
    businessSchedule: "daily",
    mainProductsOrServicesCategory: "groceries_household_items",
    monthlyGrossRevenue: 80_000,
    revenuePeriod: "last_30_days",
    revenueConfidence: "sales_records",
    monthlyInventoryCost: 30_000,
    monthlyBusinessRent: 5_000,
    monthlyBusinessElectricity: 2_000,
    monthlyBusinessWater: 500,
    monthlySupplierCreditPayment: 1_000,
    otherBusinessExpenses: 500,
    monthlyRentOrMortgage: 6_000,
    monthlyElectricityBill: 2_000,
    monthlyWaterBill: 500,
    monthlyInternetPhoneBill: 1_000,
    monthlyFoodGroceries: 8_000,
    monthlyTransportation: 1_500,
    householdExpensesCompleted: true,
    hasExistingDebts: true,
    personalLoanPayments: 2_000,
    businessLoanPayments: 3_000,
    existingDebtDeclarationCompleted: true,
    cashOnHand: 5_000,
    bankSavings: 10_000,
    ewalletBalance: 2_500,
    inventoryValue: 35_000,
    hasBusinessRegistration: true,
    businessRegistrationType: "barangay_permit",
    registrationNumber: "BRGY-2026-001",
    registrationDate: "2026-01-15",
    loanPurposeContext:
      "Additional inventory and store supplies for the next month of sari-sari store operations.",
    confirmsBusinessOperating: true,
    confirmsInformationTrue: true,
    consentsToDataProcessing: true,
    consentsToCreditCheck: true,
    ...overrides,
  });
}

describe("microbusiness borrower readiness", () => {
  it("accepts a complete sari-sari store profile", () => {
    const profile = completeProfile();

    expect(borrowerPortfolioSchema.safeParse(profile).success).toBe(true);
    expect(evaluateBorrowerReadiness(profile).readinessStatus).toBe(
      "needs_review",
    );
    expect(evaluateBorrowerReadiness(profile).riskFlags).not.toContain(
      "zero_revenue",
    );
  });

  it("accepts informal or unregistered microbusinesses for review", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({
        hasBusinessRegistration: false,
        businessRegistrationType: null,
        registrationNumber: "",
        registrationDate: "",
        ownershipType: "informal_unregistered",
        unregisteredReason: "Operates as an informal home-based store.",
      }),
    );

    expect(readiness.readinessStatus).toBe("needs_review");
    expect(readiness.riskFlags).toContain("no_business_proof");
    expect(readiness.riskFlags).not.toContain("not_eligible");
  });

  it("requires registration details when the business is registered", () => {
    const result = borrowerBusinessOperationsSchema.safeParse({
      hasBusinessRegistration: true,
      businessRegistrationType: null,
      registrationNumber: "",
      registrationDate: "",
      unregisteredReason: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.businessRegistrationType).toContain(
        "Select your registration type.",
      );
      expect(result.error.flatten().fieldErrors.registrationNumber).toContain(
        "Enter your registration number.",
      );
      expect(result.error.flatten().fieldErrors.registrationDate).toContain(
        "Enter your registration date.",
      );
    }
  });

  it("requires an unregistered reason when the business is not registered", () => {
    const result = borrowerBusinessOperationsSchema.safeParse({
      hasBusinessRegistration: false,
      businessRegistrationType: null,
      registrationNumber: "",
      registrationDate: "",
      unregisteredReason: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.unregisteredReason).toContain(
        "Explain why the business is unregistered.",
      );
    }
  });

  it("normalizes saved registration data into a checked state", () => {
    const mapped = mapBorrowerPortfolioRow({
      id: "portfolio-registration-1",
      borrower_id: "borrower-1",
      business_name: "Old Store",
      business_description: null,
      business_type: "sari_sari_store",
      started_operating_at: null,
      business_address: null,
      barangay: null,
      city_or_municipality: null,
      province: null,
      region: null,
      zip_code: null,
      location: "Quezon City",
      operating_model: null,
      primary_sales_channel: null,
      revenue_period: null,
      revenue_confidence: null,
      monthly_gross_revenue: 50_000,
      monthly_expenses: 30_000,
      existing_loan_payments: 2_000,
      years_in_operation: 1,
      main_products_or_services: null,
      expense_breakdown: {},
      debt_obligation_summary: {},
      loan_purpose_context: "Inventory restock for continued store operations.",
      profile_last_confirmed_at: null,
      profile_review_status: "self_declared",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      has_business_registration: false,
      business_registration_type: "dti",
      registration_number: "DTI-12345",
      registration_date: "2026-01-15",
      unregistered_reason: "Legacy stale value",
    });

    expect(mapped.hasBusinessRegistration).toBe(true);
    expect(mapped.businessRegistrationType).toBe("dti");
    expect(mapped.registrationNumber).toBe("DTI-12345");
    expect(mapped.registrationDate).toBe("2026-01-15");
    expect(mapped.unregisteredReason).toBe("");
  });

  it("normalizes saved unregistered profiles into an unchecked state", () => {
    const mapped = mapBorrowerPortfolioRow({
      id: "portfolio-registration-2",
      borrower_id: "borrower-1",
      business_name: "Old Store",
      business_description: null,
      business_type: "sari_sari_store",
      started_operating_at: null,
      business_address: null,
      barangay: null,
      city_or_municipality: null,
      province: null,
      region: null,
      zip_code: null,
      location: "Quezon City",
      operating_model: null,
      primary_sales_channel: null,
      revenue_period: null,
      revenue_confidence: null,
      monthly_gross_revenue: 50_000,
      monthly_expenses: 30_000,
      existing_loan_payments: 2_000,
      years_in_operation: 1,
      main_products_or_services: null,
      expense_breakdown: {},
      debt_obligation_summary: {},
      loan_purpose_context: "Inventory restock for continued store operations.",
      profile_last_confirmed_at: null,
      profile_review_status: "needs_review",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      has_business_registration: true,
      business_registration_type: null,
      registration_number: null,
      registration_date: null,
      unregistered_reason: "Still processing registration.",
    });

    expect(mapped.hasBusinessRegistration).toBe(false);
    expect(mapped.businessRegistrationType).toBeNull();
    expect(mapped.registrationNumber).toBe("");
    expect(mapped.registrationDate).toBe("");
    expect(mapped.unregisteredReason).toBe(
      "Still processing registration.",
    );
  });

  it("marks missing business name as incomplete", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({ businessName: "" }),
    );

    expect(readiness.readinessStatus).toBe("incomplete");
    expect(readiness.missingFields).toContain("Business name");
  });

  it("does not throw when a physical business address is incomplete", () => {
    const readiness = evaluateBorrowerReadiness({
      ...getBorrowerPortfolioDefaultValues(),
      businessName: "Nena Store",
      businessType: "sari_sari_store",
      operatingModel: "physical_store",
      location: "",
      address: {
        regionCode: "",
        regionName: "",
        cityOrMunicipality: "",
        barangay: "",
        zipCode: "",
      },
      streetAddress: "",
    });

    expect(readiness.readinessStatus).toBe("incomplete");
    expect(readiness.missingFields).toContain("Business region");
    expect(readiness.missingFields).toContain("Business city or municipality");
    expect(readiness.missingFields).toContain("Business barangay");
    expect(readiness.missingFields).toContain("Business street address");
  });

  it("does not require business address fields for online-only profiles", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({
        operatingModel: "online_only",
        location: "",
        address: {
          regionCode: "",
          regionName: "",
          cityOrMunicipality: "",
          barangay: "",
          zipCode: "",
        },
        streetAddress: "",
        isBusinessAddressSameAsHome: true,
      }),
    );

    expect(readiness.missingFields).not.toContain("Business region");
    expect(readiness.missingFields).not.toContain("Business street address");
    expect(readiness.readinessStatus).toBe("needs_review");
  });

  it("derives business address readiness from home address when same as home", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({
        location: "",
        address: {
          regionCode: "",
          regionName: "",
          cityOrMunicipality: "",
          barangay: "",
          zipCode: "",
        },
        streetAddress: "",
        isBusinessAddressSameAsHome: true,
        homeAddressSelection: {
          regionCode: "NCR",
          regionName: "NCR - National Capital Region",
          cityOrMunicipality: "Quezon City",
          barangay: "Diliman",
          zipCode: "1100",
        },
        homeStreetAddress: "Unit 2, 123 Maginhawa Street",
      }),
    );

    expect(readiness.missingFields).not.toContain("Business region");
    expect(readiness.missingFields).not.toContain("Business street address");
    expect(readiness.readinessStatus).toBe("needs_review");
  });

  it("blocks zero revenue", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({ monthlyGrossRevenue: 0, averageDailySales: 0 }),
    );

    expect(readiness.readinessStatus).toBe("not_eligible");
    expect(readiness.riskFlags).toContain("zero_revenue");
  });

  it("flags expenses greater than revenue", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({ monthlyInventoryCost: 90_000 }),
    );

    expect(readiness.readinessStatus).toBe("not_eligible");
    expect(readiness.riskFlags).toContain("expenses_exceed_revenue");
  });

  it("flags high debt burden", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({
        monthlyInventoryCost: 10_000,
        monthlyRentOrMortgage: 0,
        monthlyElectricityBill: 0,
        monthlyWaterBill: 0,
        monthlyInternetPhoneBill: 0,
        monthlyFoodGroceries: 0,
        monthlyTransportation: 0,
        personalLoanPayments: 32_000,
        businessLoanPayments: 0,
      }),
    );

    expect(readiness.readinessStatus).toBe("needs_review");
    expect(readiness.riskFlags).toContain("high_debt_burden");
  });

  it("flags very new business", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({ yearsInOperation: 0.25 }),
    );

    expect(readiness.readinessStatus).toBe("needs_review");
    expect(readiness.riskFlags).toContain("very_new_business");
  });

  it("flags vague loan purpose", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({ loanPurposeContext: "capital only" }),
    );

    expect(readiness.readinessStatus).toBe("needs_review");
    expect(readiness.riskFlags).toContain("vague_loan_purpose");
  });

  it("blocks readiness when profile confirmations are false", () => {
    for (const field of [
      "confirmsInformationTrue",
      "consentsToDataProcessing",
      "consentsToCreditCheck",
    ] as const) {
      const readiness = evaluateBorrowerReadiness(
        completeProfile({ [field]: false }),
      );

      expect(readiness.readinessStatus).toBe("incomplete");
    }
  });

  it("blocks readiness when business operating confirmation is false", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({ confirmsBusinessOperating: false }),
    );

    expect(readiness.readinessStatus).toBe("incomplete");
    expect(readiness.missingFields).toContain("Business operating confirmation");
  });

  it("infers household and debt declarations from saved profile values", () => {
    const profile = completeProfile({
      householdExpensesCompleted: false,
      existingDebtDeclarationCompleted: false,
    });
    const readiness = evaluateBorrowerReadiness(profile);

    expect(profile.householdExpensesCompleted).toBe(true);
    expect(profile.existingDebtDeclarationCompleted).toBe(true);
    expect(readiness.missingFields).not.toContain(
      "Household expense declaration",
    );
    expect(readiness.missingFields).not.toContain("Existing debt declaration");
  });

  it("requires a short purpose when loan purpose is other", () => {
    const result = borrowerPortfolioSchema.safeParse({
      ...completeProfile(),
      loanPurposeCategory: "other",
      loanPurposeOther: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.loanPurposeOther).toContain(
        "Enter a short loan purpose.",
      );
    }
  });

  it("requires products or services when business basics are saved", () => {
    const result = borrowerPortfolioSchema.safeParse({
      ...completeProfile(),
      mainProductsOrServicesCategory: null,
      mainProductsOrServices: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.flatten().fieldErrors.mainProductsOrServicesCategory,
      ).toContain("Select your main products or services.");
    }
  });

  it("requires a custom products or services value for other", () => {
    const result = borrowerPortfolioSchema.safeParse({
      ...completeProfile(),
      mainProductsOrServicesCategory: "other",
      mainProductsOrServicesOther: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.flatten().fieldErrors.mainProductsOrServicesOther,
      ).toContain("Please specify your main products or services.");
    }
  });

  it("maps standardized products or services labels from saved rows", () => {
    const mapped = mapBorrowerPortfolioRow({
      id: "portfolio-products-1",
      borrower_id: "borrower-1",
      business_name: "Old Store",
      business_description: null,
      business_type: "sari_sari_store",
      started_operating_at: null,
      business_address: null,
      barangay: null,
      city_or_municipality: null,
      province: null,
      region: null,
      zip_code: null,
      location: "Quezon City",
      operating_model: null,
      primary_sales_channel: null,
      revenue_period: null,
      revenue_confidence: null,
      monthly_gross_revenue: 50_000,
      monthly_expenses: 30_000,
      existing_loan_payments: 2_000,
      years_in_operation: 1,
      main_products_or_services: "Food and beverages",
      expense_breakdown: {},
      debt_obligation_summary: {},
      loan_purpose_context: "Inventory restock for continued store operations.",
      profile_last_confirmed_at: null,
      profile_review_status: "self_declared",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapped.mainProductsOrServicesCategory).toBe("food_beverages");
    expect(mapped.mainProductsOrServicesOther).toBe("");
  });

  it("does not render borrower-facing completion checkboxes", () => {
    const formSource = readFileSync(
      "components/borrower-portfolio-form.tsx",
      "utf8",
    );

    expect(formSource).not.toContain(
      "Household expense declaration is complete",
    );
    expect(formSource).not.toContain("Existing debt declaration is complete");
  });

  it("calculates business, household, debt, and disposable totals", () => {
    const profile = completeProfile();

    expect(calculateTotalBusinessExpenses(profile)).toBe(39_000);
    expect(calculateTotalHouseholdExpenses(profile)).toBe(19_000);
    expect(calculateTotalExistingDebtPayments(profile)).toBe(5_000);
    expect(calculateDisposableIncome(profile)).toBe(17_000);
  });

  it("does not double-count supplier credit as existing debt", () => {
    const profile = completeProfile({
      monthlySupplierCreditPayment: 4_000,
      personalLoanPayments: 0,
      businessLoanPayments: 0,
    });

    expect(calculateTotalBusinessExpenses(profile)).toBe(42_000);
    expect(calculateTotalExistingDebtPayments(profile)).toBe(0);
  });

  it("flags high customer credit exposure", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({
        offersCustomerCredit: true,
        estimatedCustomerCreditAmount: 20_000,
      }),
    );

    expect(readiness.riskFlags).toContain("high_customer_credit_exposure");
  });

  it("flags self-declared income only for review", () => {
    const readiness = evaluateBorrowerReadiness(
      completeProfile({ revenueConfidence: "self_declared_only" }),
    );

    expect(readiness.readinessStatus).toBe("needs_review");
    expect(readiness.riskFlags).toContain("self_declared_income_only");
  });

  it("maps old minimal portfolio rows without crashing", () => {
    const mapped = mapBorrowerPortfolioRow({
      id: "portfolio-1",
      borrower_id: "borrower-1",
      business_name: "Old Store",
      business_description: null,
      business_type: "sari_sari_store",
      started_operating_at: null,
      business_address: null,
      barangay: null,
      city_or_municipality: null,
      province: null,
      region: null,
      zip_code: null,
      location: "Quezon City",
      operating_model: null,
      primary_sales_channel: null,
      revenue_period: null,
      revenue_confidence: null,
      monthly_gross_revenue: 50_000,
      monthly_expenses: 30_000,
      existing_loan_payments: 2_000,
      years_in_operation: 1,
      expense_breakdown: {},
      debt_obligation_summary: {},
      loan_purpose_context: "Inventory restock for continued store operations.",
      profile_last_confirmed_at: null,
      profile_review_status: "self_declared",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapped.businessName).toBe("Old Store");
    expect(mapped.monthlyExpenses).toBe(30_000);
    expect(mapped.existingLoanPayments).toBe(2_000);
  });
});

import { describe, expect, it } from "vitest";
import {
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
        ownershipType: "informal_unregistered",
        unregisteredReason: "Operates as an informal home-based store.",
      }),
    );

    expect(readiness.readinessStatus).toBe("needs_review");
    expect(readiness.riskFlags).toContain("no_business_proof");
    expect(readiness.riskFlags).not.toContain("not_eligible");
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

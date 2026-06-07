import { z } from "zod";
import type { Database } from "@/lib/supabase/types";
import {
  isValidPhilippineAddressSelection,
  formatPhilippineAddress,
} from "@/lib/philippine-addresses";
import type { PhilippineAddressSelection } from "@/lib/philippine-addresses";

export const draftLocationPlaceholder = "Profile location pending";

export const businessTypeOptions = [
  "sari_sari_store",
  "food_stall",
  "online_seller",
  "market_vendor",
  "service_provider",
  "small_retail_shop",
  "laundry_service",
  "beauty_barber_service",
  "repair_service",
  "transport_delivery_operator",
  "other",
] as const;

export const ownershipTypeOptions = [
  "sole_proprietor",
  "family_owned",
  "partnership",
  "informal_unregistered",
  "other",
] as const;

export const borrowerRoleOptions = [
  "owner_proprietor",
  "co_owner",
  "manager",
  "family_operator",
] as const;

export const operatingModelOptions = [
  "physical_store",
  "home_based",
  "market_stall",
  "mobile_delivery_based",
  "online_only",
  "mixed_online_physical",
] as const;

export const primarySalesChannelOptions = [
  "walk_in_customers",
  "online_orders",
  "facebook_marketplace",
  "ecommerce_platform",
  "delivery_apps",
  "regular_clients",
  "other",
] as const;

export const businessScheduleOptions = [
  "daily",
  "weekdays_only",
  "weekends_only",
  "seasonal",
  "irregular",
] as const;

export const businessRegistrationTypeOptions = [
  "barangay_permit",
  "dti",
  "mayors_permit",
  "bir",
  "sec",
  "other",
] as const;

export const revenuePeriodOptions = [
  "last_7_days",
  "last_30_days",
  "last_3_months_average",
  "last_6_months_average",
  "self_estimated_normal_month",
] as const;

export const revenueConfidenceOptions = [
  "sales_records",
  "bank_ewallet_proof",
  "supplier_receipts",
  "self_declared_only",
] as const;

export const averageCollectionPeriodOptions = [
  "daily",
  "weekly",
  "every_payday",
  "monthly",
  "irregular",
] as const;

export const profileReviewStatusOptions = [
  "self_declared",
  "needs_review",
  "reviewed",
  "rejected",
  "stale",
] as const;

function normalizeNumberInput(value: unknown) {
  if (typeof value === "string") {
    const normalizedValue = value.replace(/,/g, "").trim();

    if (normalizedValue === "") {
      return 0;
    }

    const parsedValue = Number(normalizedValue);

    return Number.isNaN(parsedValue) ? value : parsedValue;
  }

  return value ?? 0;
}

function numberField(max = 10_000_000) {
  return z.preprocess(
    normalizeNumberInput,
    z
      .number({ error: "Enter a valid amount." })
      .min(0, "Amount cannot be negative.")
      .max(max, `Amount must be below PHP ${max.toLocaleString("en-PH")}.`),
  );
}

const shortText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const addressSelectionSchema = z
  .object({
    regionCode: z.string().optional().default(""),
    regionName: z.string().optional().default(""),
    cityOrMunicipality: z.string().optional().default(""),
    barangay: z.string().optional().default(""),
    zipCode: z.string().optional().default(""),
  })
  .superRefine((value, context) => {
    const hasAnyAddressValue = Object.values(value).some(
      (item) => item.trim().length > 0,
    );

    if (hasAnyAddressValue && !isValidPhilippineAddressSelection(value)) {
      context.addIssue({
        code: "custom",
        path: ["regionCode"],
        message:
          "The selected region, city, barangay, and ZIP code combination is not valid.",
      });
    }
  });

const borrowerPortfolioBaseSchema = z.object({
  mobileNumber: shortText(30),
  homeAddress: shortText(240),
  yearsAtCurrentAddress: numberField(100),
  emergencyContactName: shortText(120),
  emergencyContactNumber: shortText(30),
  emergencyContactRelationship: shortText(80),

  businessName: shortText(120),
  businessType: z.enum(businessTypeOptions).default("sari_sari_store"),
  location: shortText(240),
  address: addressSelectionSchema.default({
    regionCode: "",
    regionName: "",
    cityOrMunicipality: "",
    barangay: "",
    zipCode: "",
  }),
  streetAddress: shortText(240),
  isBusinessAddressSameAsHome: z.boolean().default(false),
  ownershipType: z.enum(ownershipTypeOptions).default("sole_proprietor"),
  borrowerRole: z.enum(borrowerRoleOptions).default("owner_proprietor"),
  yearsInOperation: numberField(100),

  operatingModel: z.enum(operatingModelOptions).default("physical_store"),
  primarySalesChannel: z
    .enum(primarySalesChannelOptions)
    .default("walk_in_customers"),
  businessSchedule: z.enum(businessScheduleOptions).default("daily"),
  numberOfEmployees: numberField(500),
  mainProductsOrServices: shortText(800),
  mainSuppliers: shortText(800),
  keepsSalesRecords: z.boolean().default(false),
  usesBankOrEwallet: z.boolean().default(false),
  offersCustomerCredit: z.boolean().default(false),

  hasBusinessRegistration: z.boolean().default(false),
  businessRegistrationType: z
    .enum(businessRegistrationTypeOptions)
    .nullable()
    .optional(),
  registrationNumber: shortText(120),
  registrationDate: shortText(40),
  unregisteredReason: shortText(500),

  averageDailySales: numberField(),
  averageWeeklySales: numberField(),
  monthlyGrossRevenue: numberField(),
  revenuePeriod: z.enum(revenuePeriodOptions).default("last_30_days"),
  revenueConfidence: z
    .enum(revenueConfidenceOptions)
    .default("self_declared_only"),
  bestMonthSales: numberField(),
  worstMonthSales: numberField(),

  monthlyInventoryCost: numberField(),
  monthlyBusinessRent: numberField(),
  monthlyBusinessElectricity: numberField(),
  monthlyBusinessWater: numberField(),
  monthlyHelperSalary: numberField(),
  monthlyTransportationDelivery: numberField(),
  monthlyPackagingCost: numberField(),
  monthlyPlatformFees: numberField(),
  monthlyMaintenanceRepairs: numberField(),
  monthlySupplierCreditPayment: numberField(),
  otherBusinessExpenses: numberField(),
  monthlyExpenses: numberField(),

  monthlyRentOrMortgage: numberField(),
  monthlyElectricityBill: numberField(),
  monthlyWaterBill: numberField(),
  monthlyInternetPhoneBill: numberField(),
  monthlyFoodGroceries: numberField(),
  monthlyTransportation: numberField(),
  monthlyTuitionEducation: numberField(),
  monthlyMedicalExpenses: numberField(),
  monthlyInsurance: numberField(),
  monthlyFamilySupport: numberField(),
  otherHouseholdExpenses: numberField(),
  numberOfDependents: numberField(100),
  numberOfEarningHouseholdMembers: numberField(100),
  householdExpensesCompleted: z.boolean().default(false),

  hasExistingDebts: z.boolean().default(false),
  personalLoanPayments: numberField(),
  businessLoanPayments: numberField(),
  vehicleLoanPayments: numberField(),
  homeLoanPayments: numberField(),
  lendingAppPayments: numberField(),
  informalLoanPayments: numberField(),
  buyNowPayLaterPayments: numberField(),
  creditCardPayments: numberField(),
  coMakerGuaranteedLoanPayments: numberField(),
  otherDebtPayments: numberField(),
  existingLoanPayments: numberField(),
  existingDebtDeclarationCompleted: z.boolean().default(false),

  cashOnHand: numberField(),
  bankSavings: numberField(),
  ewalletBalance: numberField(),
  inventoryValue: numberField(),
  businessEquipmentValue: numberField(),
  vehicleValue: numberField(),
  propertyLandValue: numberField(),
  otherAssetsValue: numberField(),

  estimatedCustomerCreditAmount: numberField(),
  averageCollectionPeriod: z
    .enum(averageCollectionPeriodOptions)
    .nullable()
    .optional(),
  keepsCustomerDebtList: z.boolean().nullable().optional(),

  loanPurposeContext: z
    .string()
    .trim()
    .max(800, "Keep the loan purpose context under 800 characters.")
    .optional()
    .or(z.literal("")),

  hasOverdueLoans: z.boolean().default(false),
  missedPaymentsLast12Months: z.boolean().default(false),
  hasUnpaidLendingAppLoans: z.boolean().default(false),
  hasBouncedChecks: z.boolean().default(false),
  isCoMakerOrGuarantor: z.boolean().default(false),
  hasDebtRelatedLegalCase: z.boolean().default(false),
  hasRepossessionHistory: z.boolean().default(false),
  hasTaxArrears: z.boolean().default(false),
  businessTemporarilyStopped: z.boolean().default(false),
  confirmsBusinessOperating: z.boolean().default(false),

  confirmsInformationTrue: z.boolean().default(false),
  consentsToDataProcessing: z.boolean().default(false),
  consentsToCreditCheck: z.boolean().default(false),
});

export type BorrowerPortfolioFormInput = z.infer<
  typeof borrowerPortfolioBaseSchema
>;
export type BorrowerPortfolioInput = BorrowerPortfolioFormInput;

export const borrowerPortfolioSchema = borrowerPortfolioBaseSchema.transform(
  (value): BorrowerPortfolioInput => {
    const monthlyGrossRevenue: number =
      value.monthlyGrossRevenue > 0
        ? value.monthlyGrossRevenue
        : value.averageDailySales > 0
          ? value.averageDailySales * 30
          : 0;
    const totalBusinessExpenses: number = calculateTotalBusinessExpenses(value);
    const totalExistingDebtPayments: number =
      calculateTotalExistingDebtPayments(value);

    return {
      ...value,
      monthlyGrossRevenue,
      monthlyExpenses: totalBusinessExpenses,
      existingLoanPayments: totalExistingDebtPayments,
    };
  },
);

type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];

export function getBorrowerPortfolioDefaultValues(): BorrowerPortfolioInput {
  return borrowerPortfolioSchema.parse({});
}

export function calculateTotalBusinessExpenses(
  portfolio: Partial<Record<keyof BorrowerPortfolioInput, unknown>>,
): number {
  return sumFields(portfolio, [
    "monthlyInventoryCost",
    "monthlyBusinessRent",
    "monthlyBusinessElectricity",
    "monthlyBusinessWater",
    "monthlyHelperSalary",
    "monthlyTransportationDelivery",
    "monthlyPackagingCost",
    "monthlyPlatformFees",
    "monthlyMaintenanceRepairs",
    "monthlySupplierCreditPayment",
    "otherBusinessExpenses",
  ]);
}

export function calculateTotalHouseholdExpenses(
  portfolio: Partial<Record<keyof BorrowerPortfolioInput, unknown>>,
): number {
  return sumFields(portfolio, [
    "monthlyRentOrMortgage",
    "monthlyElectricityBill",
    "monthlyWaterBill",
    "monthlyInternetPhoneBill",
    "monthlyFoodGroceries",
    "monthlyTransportation",
    "monthlyTuitionEducation",
    "monthlyMedicalExpenses",
    "monthlyInsurance",
    "monthlyFamilySupport",
    "otherHouseholdExpenses",
  ]);
}

export function calculateTotalExistingDebtPayments(
  portfolio: Partial<Record<keyof BorrowerPortfolioInput, unknown>>,
): number {
  return sumFields(portfolio, [
    "personalLoanPayments",
    "businessLoanPayments",
    "vehicleLoanPayments",
    "homeLoanPayments",
    "lendingAppPayments",
    "informalLoanPayments",
    "buyNowPayLaterPayments",
    "creditCardPayments",
    "coMakerGuaranteedLoanPayments",
    "otherDebtPayments",
  ]);
}

export function calculateTotalDeclaredAssets(
  portfolio: Partial<Record<keyof BorrowerPortfolioInput, unknown>>,
): number {
  return sumFields(portfolio, [
    "cashOnHand",
    "bankSavings",
    "ewalletBalance",
    "inventoryValue",
    "businessEquipmentValue",
    "vehicleValue",
    "propertyLandValue",
    "otherAssetsValue",
  ]);
}

export function calculateNetMonthlyBusinessIncome(
  portfolio: Partial<Record<keyof BorrowerPortfolioInput, unknown>>,
) {
  return toNumber(portfolio.monthlyGrossRevenue) - calculateTotalBusinessExpenses(portfolio);
}

export function calculateDisposableIncome(
  portfolio: Partial<Record<keyof BorrowerPortfolioInput, unknown>>,
) {
  return (
    calculateNetMonthlyBusinessIncome(portfolio) -
    calculateTotalHouseholdExpenses(portfolio) -
    calculateTotalExistingDebtPayments(portfolio)
  );
}

export function mapBorrowerPortfolioRow(
  row: BorrowerPortfolioRow,
): BorrowerPortfolioInput {
  const regionCode = row.region ?? "";
  const cityOrMunicipality = row.city_or_municipality ?? "";
  const barangay = row.barangay ?? "";
  const zipCode = row.zip_code ?? "";
  const expenseBreakdown = asRecord(row.expense_breakdown);
  const debtSummary = asRecord(row.debt_obligation_summary);

  const address: PhilippineAddressSelection = {
    regionCode,
    regionName: regionCode,
    cityOrMunicipality,
    barangay,
    zipCode,
  };

  const mapped = {
    mobileNumber: stringFrom(row.mobile_number),
    homeAddress: stringFrom(row.home_address),
    yearsAtCurrentAddress: toNumber(row.years_at_current_address),
    emergencyContactName: stringFrom(row.emergency_contact_name),
    emergencyContactNumber: stringFrom(row.emergency_contact_number),
    emergencyContactRelationship: stringFrom(
      row.emergency_contact_relationship,
    ),
    businessName: row.business_name ?? "",
    businessType: mapBusinessType(row.business_type),
    location: row.location === draftLocationPlaceholder ? "" : row.location ?? "",
    address,
    streetAddress: row.business_address ?? "",
    isBusinessAddressSameAsHome: Boolean(row.is_business_address_same_as_home),
    ownershipType: mapOption(row.ownership_type, ownershipTypeOptions, "sole_proprietor"),
    borrowerRole: mapOption(row.borrower_role, borrowerRoleOptions, "owner_proprietor"),
    yearsInOperation: toNumber(row.years_in_operation),
    operatingModel: mapOperatingModel(row.operating_model),
    primarySalesChannel: mapPrimarySalesChannel(row.primary_sales_channel),
    businessSchedule: mapOption(row.business_schedule, businessScheduleOptions, "daily"),
    numberOfEmployees: toNumber(row.number_of_employees),
    mainProductsOrServices: stringFrom(row.main_products_or_services),
    mainSuppliers: stringFrom(row.main_suppliers),
    keepsSalesRecords: Boolean(row.keeps_sales_records),
    usesBankOrEwallet: Boolean(row.uses_bank_or_ewallet),
    offersCustomerCredit: Boolean(row.offers_customer_credit),
    hasBusinessRegistration: Boolean(row.has_business_registration),
    businessRegistrationType: mapNullableOption(
      row.business_registration_type,
      businessRegistrationTypeOptions,
    ),
    registrationNumber: stringFrom(row.registration_number),
    registrationDate: stringFrom(row.registration_date),
    unregisteredReason: stringFrom(row.unregistered_reason),
    averageDailySales: toNumber(row.average_daily_sales),
    averageWeeklySales: toNumber(row.average_weekly_sales),
    monthlyGrossRevenue: toNumber(row.monthly_gross_revenue),
    revenuePeriod: mapRevenuePeriod(row.revenue_period),
    revenueConfidence: mapRevenueConfidence(row.revenue_confidence),
    bestMonthSales: toNumber(row.best_month_sales),
    worstMonthSales: toNumber(row.worst_month_sales),
    monthlyInventoryCost: numberFrom(row.monthly_inventory_cost, expenseBreakdown.inventory),
    monthlyBusinessRent: numberFrom(row.monthly_business_rent, expenseBreakdown.rent),
    monthlyBusinessElectricity: numberFrom(row.monthly_business_electricity),
    monthlyBusinessWater: numberFrom(row.monthly_business_water),
    monthlyHelperSalary: numberFrom(row.monthly_helper_salary, expenseBreakdown.payroll),
    monthlyTransportationDelivery: numberFrom(row.monthly_transportation_delivery),
    monthlyPackagingCost: numberFrom(row.monthly_packaging_cost),
    monthlyPlatformFees: numberFrom(row.monthly_platform_fees),
    monthlyMaintenanceRepairs: numberFrom(row.monthly_maintenance_repairs),
    monthlySupplierCreditPayment: numberFrom(row.monthly_supplier_credit_payment),
    otherBusinessExpenses: numberFrom(row.other_business_expenses, expenseBreakdown.other),
    monthlyExpenses: toNumber(row.monthly_expenses),
    monthlyRentOrMortgage: toNumber(row.monthly_rent_or_mortgage),
    monthlyElectricityBill: toNumber(row.monthly_electricity_bill),
    monthlyWaterBill: toNumber(row.monthly_water_bill),
    monthlyInternetPhoneBill: toNumber(row.monthly_internet_phone_bill),
    monthlyFoodGroceries: toNumber(row.monthly_food_groceries),
    monthlyTransportation: toNumber(row.monthly_transportation),
    monthlyTuitionEducation: toNumber(row.monthly_tuition_education),
    monthlyMedicalExpenses: toNumber(row.monthly_medical_expenses),
    monthlyInsurance: toNumber(row.monthly_insurance),
    monthlyFamilySupport: toNumber(row.monthly_family_support),
    otherHouseholdExpenses: toNumber(row.other_household_expenses),
    numberOfDependents: toNumber(row.number_of_dependents),
    numberOfEarningHouseholdMembers: toNumber(
      row.number_of_earning_household_members,
    ),
    householdExpensesCompleted: Boolean(row.household_expenses_completed),
    hasExistingDebts: Boolean(row.has_existing_debts),
    personalLoanPayments: numberFrom(row.personal_loan_payments),
    businessLoanPayments: numberFrom(row.business_loan_payments),
    vehicleLoanPayments: numberFrom(row.vehicle_loan_payments),
    homeLoanPayments: numberFrom(row.home_loan_payments),
    lendingAppPayments: numberFrom(row.lending_app_payments),
    informalLoanPayments: numberFrom(row.informal_loan_payments),
    buyNowPayLaterPayments: numberFrom(row.buy_now_pay_later_payments),
    creditCardPayments: numberFrom(row.credit_card_payments),
    coMakerGuaranteedLoanPayments: numberFrom(row.co_maker_guaranteed_loan_payments),
    otherDebtPayments: numberFrom(row.other_debt_payments, debtSummary.total_outstanding_debt),
    existingLoanPayments: toNumber(row.existing_loan_payments),
    existingDebtDeclarationCompleted: Boolean(
      row.existing_debt_declaration_completed,
    ),
    cashOnHand: toNumber(row.cash_on_hand),
    bankSavings: toNumber(row.bank_savings),
    ewalletBalance: toNumber(row.ewallet_balance),
    inventoryValue: toNumber(row.inventory_value),
    businessEquipmentValue: toNumber(row.business_equipment_value),
    vehicleValue: toNumber(row.vehicle_value),
    propertyLandValue: toNumber(row.property_land_value),
    otherAssetsValue: toNumber(row.other_assets_value),
    estimatedCustomerCreditAmount: toNumber(row.estimated_customer_credit_amount),
    averageCollectionPeriod: mapNullableOption(
      row.average_collection_period,
      averageCollectionPeriodOptions,
    ),
    keepsCustomerDebtList: row.keeps_customer_debt_list,
    loanPurposeContext: row.loan_purpose_context ?? "",
    hasOverdueLoans: Boolean(row.has_overdue_loans),
    missedPaymentsLast12Months: Boolean(row.missed_payments_last_12_months),
    hasUnpaidLendingAppLoans: Boolean(row.has_unpaid_lending_app_loans),
    hasBouncedChecks: Boolean(row.has_bounced_checks),
    isCoMakerOrGuarantor: Boolean(row.is_co_maker_or_guarantor),
    hasDebtRelatedLegalCase: Boolean(row.has_debt_related_legal_case),
    hasRepossessionHistory: Boolean(row.has_repossession_history),
    hasTaxArrears: Boolean(row.has_tax_arrears),
    businessTemporarilyStopped: Boolean(row.business_temporarily_stopped),
    confirmsBusinessOperating: Boolean(row.confirms_business_operating),
    confirmsInformationTrue: Boolean(row.confirms_information_true),
    consentsToDataProcessing: Boolean(row.consents_to_data_processing),
    consentsToCreditCheck: Boolean(row.consents_to_credit_check),
  };

  return borrowerPortfolioSchema.parse(backfillDetailedTotals(mapped));
}

export function resolveBorrowerAddressFields(
  input: BorrowerPortfolioInput,
): {
  location: string;
  businessAddress: string | null;
  barangay: string | null;
  cityOrMunicipality: string | null;
  region: string | null;
  zipCode: string | null;
} {
  const hasStructuredAddress =
    input.address.regionCode &&
    input.address.cityOrMunicipality &&
    input.address.barangay &&
    input.address.zipCode;
  const formatted = hasStructuredAddress
    ? formatPhilippineAddress(input.address, input.streetAddress || undefined)
    : (input.location ?? "").trim();

  return {
    location: formatted || draftLocationPlaceholder,
    businessAddress: input.streetAddress?.trim() || null,
    barangay: input.address.barangay || null,
    cityOrMunicipality: input.address.cityOrMunicipality || null,
    region: input.address.regionCode || null,
    zipCode: input.address.zipCode || null,
  };
}

export const businessTypeLabels: Record<
  (typeof businessTypeOptions)[number],
  string
> = {
  sari_sari_store: "Sari-sari store",
  food_stall: "Food stall or carinderia",
  online_seller: "Online selling business",
  market_vendor: "Market stall",
  service_provider: "Service provider",
  small_retail_shop: "Small retail shop",
  laundry_service: "Laundry service",
  beauty_barber_service: "Beauty or barber service",
  repair_service: "Repair service",
  transport_delivery_operator: "Transport or delivery microbusiness",
  other: "Other microbusiness",
};

export const ownershipTypeLabels = {
  sole_proprietor: "Sole proprietor",
  family_owned: "Family-owned",
  partnership: "Partnership",
  informal_unregistered: "Informal or unregistered",
  other: "Other",
} satisfies Record<(typeof ownershipTypeOptions)[number], string>;

export const borrowerRoleLabels = {
  owner_proprietor: "Owner or proprietor",
  co_owner: "Co-owner",
  manager: "Manager",
  family_operator: "Family operator",
} satisfies Record<(typeof borrowerRoleOptions)[number], string>;

export const operatingModelLabels = {
  physical_store: "Physical store",
  home_based: "Home-based",
  market_stall: "Market stall",
  mobile_delivery_based: "Mobile or delivery-based",
  online_only: "Online only",
  mixed_online_physical: "Online and physical",
} satisfies Record<(typeof operatingModelOptions)[number], string>;

export const primarySalesChannelLabels = {
  walk_in_customers: "Walk-in customers",
  online_orders: "Online orders",
  facebook_marketplace: "Facebook Marketplace",
  ecommerce_platform: "E-commerce platform",
  delivery_apps: "Delivery apps",
  regular_clients: "Regular clients",
  other: "Other",
} satisfies Record<(typeof primarySalesChannelOptions)[number], string>;

export const businessScheduleLabels = {
  daily: "Daily",
  weekdays_only: "Weekdays only",
  weekends_only: "Weekends only",
  seasonal: "Seasonal",
  irregular: "Irregular",
} satisfies Record<(typeof businessScheduleOptions)[number], string>;

export const businessRegistrationTypeLabels = {
  barangay_permit: "Barangay permit",
  dti: "DTI",
  mayors_permit: "Mayor's permit",
  bir: "BIR",
  sec: "SEC",
  other: "Other",
} satisfies Record<(typeof businessRegistrationTypeOptions)[number], string>;

export const revenuePeriodLabels = {
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  last_3_months_average: "Last 3 months average",
  last_6_months_average: "Last 6 months average",
  self_estimated_normal_month: "Self-estimated normal month",
} satisfies Record<(typeof revenuePeriodOptions)[number], string>;

export const revenueConfidenceLabels = {
  sales_records: "Sales records",
  bank_ewallet_proof: "Bank or e-wallet proof",
  supplier_receipts: "Supplier receipts",
  self_declared_only: "Self-declared only",
} satisfies Record<(typeof revenueConfidenceOptions)[number], string>;

export const averageCollectionPeriodLabels = {
  daily: "Daily",
  weekly: "Weekly",
  every_payday: "Every payday",
  monthly: "Monthly",
  irregular: "Irregular",
} satisfies Record<(typeof averageCollectionPeriodOptions)[number], string>;

function backfillDetailedTotals(
  input: BorrowerPortfolioFormInput,
): BorrowerPortfolioFormInput {
  const detailedBusinessExpenses = calculateTotalBusinessExpenses(input);
  const detailedDebtPayments = calculateTotalExistingDebtPayments(input);

  return {
    ...input,
    otherBusinessExpenses:
      detailedBusinessExpenses === 0
        ? toNumber(input.monthlyExpenses)
        : input.otherBusinessExpenses,
    otherDebtPayments:
      detailedDebtPayments === 0
        ? toNumber(input.existingLoanPayments)
        : input.otherDebtPayments,
  };
}

function sumFields(
  portfolio: Partial<Record<string, unknown>>,
  fields: string[],
) {
  return fields.reduce((total, field) => total + toNumber(portfolio[field]), 0);
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberFrom(...values: unknown[]) {
  const value = values.find((item) => item !== null && item !== undefined);

  return toNumber(value);
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapOption<const T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback: T[number],
) {
  return options.some((option) => option === value) ? (value as T[number]) : fallback;
}

function mapNullableOption<const T extends readonly string[]>(
  value: unknown,
  options: T,
) {
  return options.some((option) => option === value) ? (value as T[number]) : null;
}

function mapBusinessType(value: unknown) {
  const legacyMap: Record<string, (typeof businessTypeOptions)[number]> = {
    market_vendor: "market_vendor",
    service_provider: "service_provider",
  };

  if (typeof value === "string" && legacyMap[value]) return legacyMap[value];

  return mapOption(value, businessTypeOptions, "other");
}

function mapOperatingModel(value: unknown) {
  const legacyMap: Record<string, (typeof operatingModelOptions)[number]> = {
    fixed_store: "physical_store",
    online: "online_only",
    mobile: "mobile_delivery_based",
    mixed: "mixed_online_physical",
    other: "physical_store",
  };

  if (typeof value === "string" && legacyMap[value]) return legacyMap[value];

  return mapOption(value, operatingModelOptions, "physical_store");
}

function mapPrimarySalesChannel(value: unknown) {
  const legacyMap: Record<string, (typeof primarySalesChannelOptions)[number]> = {
    walk_in: "walk_in_customers",
    online_marketplace: "ecommerce_platform",
    social_media: "facebook_marketplace",
    wholesale: "regular_clients",
    mixed: "walk_in_customers",
  };

  if (typeof value === "string" && legacyMap[value]) return legacyMap[value];

  return mapOption(value, primarySalesChannelOptions, "walk_in_customers");
}

function mapRevenuePeriod(value: unknown) {
  const legacyMap: Record<string, (typeof revenuePeriodOptions)[number]> = {
    average_monthly_last_3_months: "last_3_months_average",
    average_monthly_last_6_months: "last_6_months_average",
    seasonal_estimate: "self_estimated_normal_month",
  };

  if (typeof value === "string" && legacyMap[value]) return legacyMap[value];

  return mapOption(value, revenuePeriodOptions, "last_30_days");
}

function mapRevenueConfidence(value: unknown) {
  const legacyMap: Record<string, (typeof revenueConfidenceOptions)[number]> = {
    self_declared: "self_declared_only",
    partially_documented: "supplier_receipts",
    document_supported: "sales_records",
    manager_reviewed: "sales_records",
  };

  if (typeof value === "string" && legacyMap[value]) return legacyMap[value];

  return mapOption(value, revenueConfidenceOptions, "self_declared_only");
}

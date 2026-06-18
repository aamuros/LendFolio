import { z } from "zod";
import type { Database } from "@/lib/supabase/types";
import {
  formatPhilippineAddress,
  isValidPhilippineAddressSelection,
  parseLegacyAddress,
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

export const mainProductsOrServicesCategoryOptions = [
  "groceries_household_items",
  "food_beverages",
  "cooked_food_carinderia",
  "mobile_load_ewallet_services",
  "personal_care_products",
  "clothing_accessories",
  "repair_or_local_services",
  "online_selling_products",
  "agriculture_fish_meat_produce",
  "other",
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

export const loanPurposeCategoryOptions = [
  "inventory_stock",
  "equipment",
  "stall_store_improvement",
  "working_capital",
  "rent_utilities",
  "marketing",
  "debt_consolidation",
  "emergency_repair",
  "other",
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

function wholeNumberField(max = 10_000_000) {
  return z.preprocess(
    normalizeNumberInput,
    z
      .number({ error: "Enter a valid whole number." })
      .int("Enter a whole number.")
      .min(0, "Number cannot be negative.")
      .max(max, `Number must be ${max.toLocaleString("en-PH")} or less.`),
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

const emptyAddressSelection = {
  regionCode: "",
  regionName: "",
  cityOrMunicipality: "",
  barangay: "",
  zipCode: "",
};

const borrowerPortfolioBaseSchema = z.object({
  mobileNumber: shortText(30),
  homeAddress: shortText(240),
  homeAddressSelection: addressSelectionSchema.default(emptyAddressSelection),
  homeStreetAddress: shortText(240),
  yearsAtCurrentAddress: numberField(100),
  emergencyContactName: shortText(120),
  emergencyContactNumber: shortText(30),
  emergencyContactRelationship: shortText(80),

  businessName: shortText(120),
  businessType: z.enum(businessTypeOptions).default("sari_sari_store"),
  location: shortText(240),
  businessAddress: shortText(240),
  country: z.literal("Philippines").default("Philippines"),
  address: addressSelectionSchema.default(emptyAddressSelection),
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
  mainProductsOrServicesCategory: z
    .enum(mainProductsOrServicesCategoryOptions)
    .nullable()
    .default(null),
  mainProductsOrServicesOther: shortText(120),
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
  businessExpensesCompleted: z.boolean().default(false),

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
  numberOfDependents: wholeNumberField(100),
  numberOfEarningHouseholdMembers: wholeNumberField(100),
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
  assetDeclarationCompleted: z.boolean().default(false),

  hasInventory: z.boolean().nullable().optional().default(null),
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
  loanRequestCompleted: z.boolean().default(false),
  loanPurposeCategory: z
    .enum(loanPurposeCategoryOptions)
    .nullable()
    .optional()
    .default(null),
  loanPurposeOther: shortText(80),
  loanPurposeDetails: shortText(160),

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

type BorrowerBusinessRegistrationFields = {
  hasBusinessRegistration?: boolean | null;
  businessRegistrationType?:
    | (typeof businessRegistrationTypeOptions)[number]
    | null;
  registrationNumber?: string | null;
  registrationDate?: string | null;
};

function trimOptionalText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeBorrowerBusinessRegistrationFields(
  value: BorrowerBusinessRegistrationFields,
) {
  const registrationNumber = trimOptionalText(value.registrationNumber);
  const registrationDate = trimOptionalText(value.registrationDate);
  const businessRegistrationType = value.businessRegistrationType ?? null;
  const hasBusinessRegistration = Boolean(value.hasBusinessRegistration);

  if (hasBusinessRegistration) {
    return {
      hasBusinessRegistration: true,
      businessRegistrationType,
      registrationNumber,
      registrationDate,
    };
  }

  return {
    hasBusinessRegistration: false,
    businessRegistrationType: null,
    registrationNumber: "",
    registrationDate: "",
  };
}

function validateBorrowerBusinessRegistrationFields(
  value: BorrowerBusinessRegistrationFields,
  context: z.RefinementCtx,
) {
  if (value.hasBusinessRegistration) {
    const businessRegistrationType = value.businessRegistrationType ?? null;
    const registrationNumber = trimOptionalText(value.registrationNumber);
    const registrationDate = trimOptionalText(value.registrationDate);

    if (!businessRegistrationType) {
      context.addIssue({
        code: "custom",
        path: ["businessRegistrationType"],
        message: "Select your registration type.",
      });
    }

    if (!registrationNumber) {
      context.addIssue({
        code: "custom",
        path: ["registrationNumber"],
        message: "Enter your registration number.",
      });
    }

    if (!registrationDate) {
      context.addIssue({
        code: "custom",
        path: ["registrationDate"],
        message: "Enter your registration date.",
      });
    }
  }
}

function validateBorrowerBusinessStatusFields(
  value: Pick<
    BorrowerPortfolioFormInput,
    "businessTemporarilyStopped" | "confirmsBusinessOperating"
  >,
  context: z.RefinementCtx,
) {
  if (value.businessTemporarilyStopped && value.confirmsBusinessOperating) {
    context.addIssue({
      code: "custom",
      path: ["confirmsBusinessOperating"],
      message: "Select only one business status.",
    });
    context.addIssue({
      code: "custom",
      path: ["businessTemporarilyStopped"],
      message: "Select only one business status.",
    });
  }
}

const borrowerPortfolioValidatedSchema = z
  .preprocess((input) => {
    if (!input || typeof input !== "object") {
      return input;
    }

    if (
      "operatingModel" in input &&
      input.operatingModel === "online_only"
    ) {
      return {
        ...input,
        address: emptyAddressSelection,
        streetAddress: "",
        location: "Online only",
        isBusinessAddressSameAsHome: false,
      };
    }

    if (
      "isBusinessAddressSameAsHome" in input &&
      input.isBusinessAddressSameAsHome === true
    ) {
      const homeAddressSelection =
        "homeAddressSelection" in input &&
        input.homeAddressSelection &&
        typeof input.homeAddressSelection === "object"
          ? (input.homeAddressSelection as PhilippineAddressSelection)
          : emptyAddressSelection;

      return {
        ...input,
        address: homeAddressSelection,
        streetAddress:
          "homeStreetAddress" in input &&
          typeof input.homeStreetAddress === "string"
            ? input.homeStreetAddress
            : "",
      };
    }

    return input;
  }, borrowerPortfolioBaseSchema)
  .superRefine((value, context) => {
    const hasLegacyHomeAddress = Boolean(value.homeAddress?.trim());
    const hasCompleteStructuredHomeAddress =
      isValidPhilippineAddressSelection(value.homeAddressSelection) &&
      Boolean(value.homeStreetAddress?.trim());

    if (
      value.loanPurposeCategory === "other" &&
      !value.loanPurposeOther?.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["loanPurposeOther"],
        message: "Enter a short loan purpose.",
      });
    }

    const resolvedProductsOrServices = resolveMainProductsOrServicesValue(value);

    if (!resolvedProductsOrServices) {
      context.addIssue({
        code: "custom",
        path: ["mainProductsOrServicesCategory"],
        message: "Select your main products or services.",
      });
    }

    if (
      value.mainProductsOrServicesCategory === "other" &&
      !value.mainProductsOrServicesOther?.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["mainProductsOrServicesOther"],
        message: "Please specify your main products or services.",
      });
    }

    validateBorrowerBusinessRegistrationFields(value, context);
    validateBorrowerBusinessStatusFields(value, context);

    if (!isPhysicalBusinessAddressRequired(value.operatingModel)) {
      return;
    }

    if (value.isBusinessAddressSameAsHome) {
      if (!hasCompleteStructuredHomeAddress && !hasLegacyHomeAddress) {
        context.addIssue({
          code: "custom",
          path: ["homeAddressSelection", "regionCode"],
          message: "Complete your home address.",
        });
      }

      return;
    }

    if (value.location?.trim()) {
      return;
    }

    if (!value.address.regionCode) {
      context.addIssue({
        code: "custom",
        path: ["address", "regionCode"],
        message: "Select your business region.",
      });
    }

    if (!value.address.cityOrMunicipality) {
      context.addIssue({
        code: "custom",
        path: ["address", "cityOrMunicipality"],
        message: "Select your business city or municipality.",
      });
    }

    if (!value.address.barangay) {
      context.addIssue({
        code: "custom",
        path: ["address", "barangay"],
        message: "Select your business barangay.",
      });
    }

    if (!resolveStreetAddressValue(value)) {
      context.addIssue({
        code: "custom",
        path: ["streetAddress"],
        message: "Enter your business street address.",
      });
    }
  });

export type BorrowerPortfolioFormInput = z.infer<
  typeof borrowerPortfolioBaseSchema
>;
export type BorrowerPortfolioInput = BorrowerPortfolioFormInput;

export const borrowerPortfolioSchema = borrowerPortfolioValidatedSchema.transform(
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
    const debtValues = normalizeDebtPaymentValues(value);
    const businessRegistration =
      normalizeBorrowerBusinessRegistrationFields(value);

    return {
      ...value,
      ...businessRegistration,
      ...debtValues,
      homeAddress: formatHomeAddress(value),
      mainProductsOrServices: resolveMainProductsOrServicesValue(value),
      address:
        value.operatingModel === "online_only"
          ? emptyAddressSelection
          : value.isBusinessAddressSameAsHome
          ? value.homeAddressSelection
          : value.address,
      streetAddress:
        value.operatingModel === "online_only"
          ? ""
          : value.isBusinessAddressSameAsHome
          ? value.homeStreetAddress
          : value.streetAddress,
      isBusinessAddressSameAsHome:
        value.operatingModel === "online_only"
          ? false
          : value.isBusinessAddressSameAsHome,
      location:
        value.operatingModel === "online_only"
          ? "Online only"
          : value.isBusinessAddressSameAsHome
            ? formatHomeAddress(value)
            : value.location,
      monthlyGrossRevenue,
      monthlyExpenses: totalBusinessExpenses,
      businessExpensesCompleted: true,
      existingLoanPayments: totalExistingDebtPayments,
      householdExpensesCompleted: true,
      existingDebtDeclarationCompleted: true,
      assetDeclarationCompleted: true,
      loanRequestCompleted: true,
      loanPurposeContext: formatLoanPurposeContext(value),
    };
  },
);

export const borrowerPortfolioCompletionSchema = borrowerPortfolioSchema;

const requiredShortText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max);

const positiveNumberField = (message: string, max = 10_000_000) =>
  z.preprocess(
    normalizeNumberInput,
    z
      .number({ error: "Enter a valid amount." })
      .positive(message)
      .max(max, `Amount must be below PHP ${max.toLocaleString("en-PH")}.`),
  );

export const borrowerBusinessBasicsSchema = borrowerPortfolioBaseSchema
  .pick({
    businessName: true,
    businessType: true,
    businessAddress: true,
    ownershipType: true,
    borrowerRole: true,
    yearsInOperation: true,
    operatingModel: true,
    primarySalesChannel: true,
    businessSchedule: true,
    numberOfEmployees: true,
    mainProductsOrServicesCategory: true,
    mainProductsOrServicesOther: true,
    mainProductsOrServices: true,
    mainSuppliers: true,
    keepsSalesRecords: true,
    usesBankOrEwallet: true,
  })
  .extend({
    businessName: requiredShortText(120, "Enter your business name."),
  })
  .superRefine((value, context) => {
    if (!resolveMainProductsOrServicesValue(value)) {
      context.addIssue({
        code: "custom",
        path: ["mainProductsOrServicesCategory"],
        message: "Select your main products or services.",
      });
    }

    if (
      value.mainProductsOrServicesCategory === "other" &&
      !value.mainProductsOrServicesOther?.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["mainProductsOrServicesOther"],
        message: "Please specify your main products or services.",
      });
    }
  });

export const borrowerHomeAddressSchema = borrowerPortfolioBaseSchema
  .pick({
    country: true,
    businessAddress: true,
    mobileNumber: true,
    yearsAtCurrentAddress: true,
    homeAddress: true,
    homeAddressSelection: true,
    homeStreetAddress: true,
    emergencyContactName: true,
    emergencyContactNumber: true,
    emergencyContactRelationship: true,
  })
  .extend({
    mobileNumber: requiredShortText(30, "Enter your mobile number."),
    emergencyContactName: requiredShortText(
      120,
      "Enter your emergency contact name.",
    ),
    emergencyContactNumber: requiredShortText(
      30,
      "Enter your emergency contact number.",
    ),
  })
  .superRefine((value, context) => {
    const hasLegacyHomeAddress = Boolean(value.homeAddress?.trim());
    const hasCompleteStructuredHomeAddress =
      isValidPhilippineAddressSelection(value.homeAddressSelection) &&
      Boolean(value.homeStreetAddress?.trim());

    if (!hasLegacyHomeAddress && !hasCompleteStructuredHomeAddress) {
      context.addIssue({
        code: "custom",
        path: ["homeAddressSelection", "regionCode"],
        message:
          "Complete your home address first before copying it to business address.",
      });
    }
  });

export const borrowerBusinessAddressSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== "object") {
      return input;
    }

    return normalizeBorrowerBusinessAddressFields(input);
  },
  borrowerPortfolioBaseSchema.pick({
    country: true,
    businessAddress: true,
    address: true,
    streetAddress: true,
    isBusinessAddressSameAsHome: true,
    homeAddress: true,
    homeAddressSelection: true,
    homeStreetAddress: true,
    operatingModel: true,
  }),
)
  .superRefine((value, context) => {
    if (!isPhysicalBusinessAddressRequired(value.operatingModel)) return;

    if (value.isBusinessAddressSameAsHome) {
      const normalizedBusinessAddress =
        normalizeBorrowerBusinessAddressFields(value);
      const hasLegacyHomeAddress = Boolean(
        normalizedBusinessAddress.homeAddress?.trim(),
      );
      const hasCompleteStructuredHomeAddress =
        isValidPhilippineAddressSelection(
          normalizedBusinessAddress.homeAddressSelection,
        ) && Boolean(resolveStreetAddressValue(normalizedBusinessAddress));

      if (!hasLegacyHomeAddress && !hasCompleteStructuredHomeAddress) {
        context.addIssue({
          code: "custom",
          path: ["homeAddressSelection", "regionCode"],
          message:
            "Complete your home address first before copying it to business address.",
        });
      }

      if (!normalizedBusinessAddress.address.regionCode) {
        context.addIssue({
          code: "custom",
          path: ["address", "regionCode"],
          message: "Select your business region.",
        });
      }

      if (!normalizedBusinessAddress.address.cityOrMunicipality) {
        context.addIssue({
          code: "custom",
          path: ["address", "cityOrMunicipality"],
          message: "Select your business city or municipality.",
        });
      }

      if (!normalizedBusinessAddress.address.barangay) {
        context.addIssue({
          code: "custom",
          path: ["address", "barangay"],
          message: "Select your business barangay.",
        });
      }

      if (!resolveStreetAddressValue(normalizedBusinessAddress)) {
        context.addIssue({
          code: "custom",
          path: ["streetAddress"],
          message: "Enter your business street address.",
        });
      }

      return;
    }

    if (!value.address.regionCode) {
      context.addIssue({
        code: "custom",
        path: ["address", "regionCode"],
        message: "Select your business region.",
      });
    }

    if (!value.address.cityOrMunicipality) {
      context.addIssue({
        code: "custom",
        path: ["address", "cityOrMunicipality"],
        message: "Select your business city or municipality.",
      });
    }

    if (!value.address.barangay) {
      context.addIssue({
        code: "custom",
        path: ["address", "barangay"],
        message: "Select your business barangay.",
      });
    }

    if (!resolveStreetAddressValue(value)) {
      context.addIssue({
        code: "custom",
        path: ["streetAddress"],
        message: "Enter your business street address.",
      });
    }
  });

export const borrowerBusinessOperationsSchema = borrowerPortfolioBaseSchema.pick({
  hasBusinessRegistration: true,
  businessRegistrationType: true,
  registrationNumber: true,
  registrationDate: true,
}).superRefine((value, context) => {
  validateBorrowerBusinessRegistrationFields(value, context);
});

export const borrowerFinancialsSchema = borrowerPortfolioBaseSchema
  .pick({
    averageDailySales: true,
    averageWeeklySales: true,
    monthlyGrossRevenue: true,
    revenuePeriod: true,
    revenueConfidence: true,
    bestMonthSales: true,
    worstMonthSales: true,
  })
  .extend({
    monthlyGrossRevenue: positiveNumberField("Enter monthly gross sales."),
  });

export const borrowerBusinessExpensesSchema = borrowerPortfolioBaseSchema.pick({
  monthlyInventoryCost: true,
  monthlyBusinessRent: true,
  monthlyBusinessElectricity: true,
  monthlyBusinessWater: true,
  monthlyHelperSalary: true,
  monthlyTransportationDelivery: true,
  monthlyPackagingCost: true,
  monthlyPlatformFees: true,
  monthlyMaintenanceRepairs: true,
  monthlySupplierCreditPayment: true,
  otherBusinessExpenses: true,
});

export const borrowerHouseholdExpensesSchema = borrowerPortfolioBaseSchema.pick({
  monthlyRentOrMortgage: true,
  monthlyElectricityBill: true,
  monthlyWaterBill: true,
  monthlyInternetPhoneBill: true,
  monthlyFoodGroceries: true,
  monthlyTransportation: true,
  monthlyTuitionEducation: true,
  monthlyMedicalExpenses: true,
  monthlyInsurance: true,
  monthlyFamilySupport: true,
  otherHouseholdExpenses: true,
  numberOfDependents: true,
  numberOfEarningHouseholdMembers: true,
});

export const borrowerExistingDebtsSchema = borrowerPortfolioBaseSchema
  .pick({
    hasExistingDebts: true,
    personalLoanPayments: true,
    businessLoanPayments: true,
    vehicleLoanPayments: true,
    homeLoanPayments: true,
    lendingAppPayments: true,
    informalLoanPayments: true,
    buyNowPayLaterPayments: true,
    creditCardPayments: true,
    coMakerGuaranteedLoanPayments: true,
    otherDebtPayments: true,
  })
  .superRefine((value, context) => {
    if (
      value.hasExistingDebts &&
      calculateTotalExistingDebtPayments(value) <= 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["hasExistingDebts"],
        message: "Enter at least one monthly debt or installment payment.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    ...normalizeDebtPaymentValues(value),
  }));

export const borrowerAssetsSchema = borrowerPortfolioBaseSchema
  .pick({
    hasInventory: true,
    cashOnHand: true,
    bankSavings: true,
    ewalletBalance: true,
    inventoryValue: true,
    businessEquipmentValue: true,
    vehicleValue: true,
    propertyLandValue: true,
    otherAssetsValue: true,
  })
  .superRefine((value, context) => {
    if (value.hasInventory === null || value.hasInventory === undefined) {
      context.addIssue({
        code: "custom",
        path: ["hasInventory"],
        message: "Select whether you keep products or stocks for sale.",
      });
    }

    if (value.hasInventory && value.inventoryValue < 0) {
      context.addIssue({
        code: "custom",
        path: ["inventoryValue"],
        message: "Inventory value must be zero or higher.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    inventoryValue: value.hasInventory ? value.inventoryValue : 0,
  }));

export const borrowerLoanUseSchema = borrowerPortfolioBaseSchema
  .pick({
    loanPurposeCategory: true,
    loanPurposeOther: true,
    loanPurposeDetails: true,
    loanPurposeContext: true,
  })
  .superRefine((value, context) => {
    if (value.loanPurposeCategory === "other" && !value.loanPurposeOther?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["loanPurposeOther"],
        message: "Enter a short loan purpose.",
      });
    }
  });

export const borrowerCustomerCreditSchema = borrowerPortfolioBaseSchema.pick({
  offersCustomerCredit: true,
  estimatedCustomerCreditAmount: true,
  averageCollectionPeriod: true,
  keepsCustomerDebtList: true,
});

export const borrowerRepaymentHistorySchema = borrowerPortfolioBaseSchema.pick({
  hasOverdueLoans: true,
  missedPaymentsLast12Months: true,
  hasUnpaidLendingAppLoans: true,
  hasBouncedChecks: true,
  isCoMakerOrGuarantor: true,
  hasDebtRelatedLegalCase: true,
  hasRepossessionHistory: true,
  hasTaxArrears: true,
});

export const borrowerBusinessStatusSchema = borrowerPortfolioBaseSchema.pick({
  businessTemporarilyStopped: true,
  confirmsBusinessOperating: true,
}).superRefine(validateBorrowerBusinessStatusFields);

export const borrowerReviewSchema = borrowerPortfolioBaseSchema
  .pick({
    confirmsInformationTrue: true,
    consentsToDataProcessing: true,
    consentsToCreditCheck: true,
  })
  .extend({
    confirmsInformationTrue: z.literal(true, {
      error: "Confirm that this information is true.",
    }),
    consentsToDataProcessing: z.literal(true, {
      error: "Consent is required.",
    }),
    consentsToCreditCheck: z.literal(true, {
      error: "Credit review consent is required.",
    }),
  });

export const borrowerPortfolioStepIds = [
  "homeAddress",
  "businessBasics",
  "businessAddress",
  "businessOperations",
  "financials",
  "businessExpenses",
  "householdExpenses",
  "existingDebts",
  "assets",
  "loanUse",
  "customerCredit",
  "repaymentHistory",
  "businessStatus",
  "review",
] as const;

export type BorrowerPortfolioStep = (typeof borrowerPortfolioStepIds)[number];

export const borrowerPortfolioStepLabels = {
  homeAddress: "Personal / Home address",
  businessBasics: "Business basics",
  businessAddress: "Business address",
  businessOperations: "Business operations",
  financials: "Financials",
  businessExpenses: "Business expenses",
  householdExpenses: "Household expenses",
  existingDebts: "Existing loans / debts",
  assets: "Assets",
  loanUse: "Loan use",
  customerCredit: "Customer credit / utang",
  repaymentHistory: "Existing loans, debts, and repayment history",
  businessStatus: "Business status",
  review: "Review",
} satisfies Record<BorrowerPortfolioStep, string>;

export const businessProfileSectionIds = [
  "basic",
  "address",
  "operations",
  "products",
  "records",
  "loanUse",
] as const;

export type BusinessProfileSection = (typeof businessProfileSectionIds)[number];

export const businessProfileSectionLabels = {
  basic: "Basic business information",
  address: "Business address/location",
  operations: "Operations and sales",
  products: "Products, services, and suppliers",
  records: "Records and payment channels",
  loanUse: "Loan use",
} satisfies Record<BusinessProfileSection, string>;

export const businessProfileSectionStepMap = {
  basic: "businessBasics",
  address: "businessAddress",
  operations: "businessBasics",
  products: "businessBasics",
  records: "businessBasics",
  loanUse: "loanUse",
} satisfies Record<BusinessProfileSection, BorrowerPortfolioStep>;

export function getBusinessProfileSectionStep(
  section: BusinessProfileSection,
): BorrowerPortfolioStep {
  return businessProfileSectionStepMap[section];
}

export function getNextBorrowerPortfolioStep(
  currentStep: BorrowerPortfolioStep,
): BorrowerPortfolioStep | null {
  const index = borrowerPortfolioStepIds.indexOf(currentStep);

  if (index < 0 || index >= borrowerPortfolioStepIds.length - 1) {
    return null;
  }

  return borrowerPortfolioStepIds[index + 1];
}

export function mergeBorrowerPortfolioSectionValues(
  existingPortfolio: Partial<BorrowerPortfolioInput> | null,
  sectionValues: Partial<BorrowerPortfolioInput>,
): BorrowerPortfolioInput {
  return {
    ...getBorrowerPortfolioDefaultValues(),
    ...(existingPortfolio ?? {}),
    ...sectionValues,
  };
}

export const borrowerPortfolioStepSchemas = {
  homeAddress: borrowerHomeAddressSchema,
  businessBasics: borrowerBusinessBasicsSchema,
  businessAddress: borrowerBusinessAddressSchema,
  businessOperations: borrowerBusinessOperationsSchema,
  financials: borrowerFinancialsSchema,
  businessExpenses: borrowerBusinessExpensesSchema,
  householdExpenses: borrowerHouseholdExpensesSchema,
  existingDebts: borrowerExistingDebtsSchema,
  assets: borrowerAssetsSchema,
  loanUse: borrowerLoanUseSchema,
  customerCredit: borrowerCustomerCreditSchema,
  repaymentHistory: borrowerRepaymentHistorySchema,
  businessStatus: borrowerBusinessStatusSchema,
  review: borrowerReviewSchema,
} satisfies Record<BorrowerPortfolioStep, z.ZodTypeAny>;

export function getCompletedBorrowerPortfolioSteps(
  portfolio: Partial<BorrowerPortfolioInput> | null,
): BorrowerPortfolioStep[] {
  if (!portfolio) return [];

  const candidate = {
    ...getBorrowerPortfolioDefaultValues(),
    ...portfolio,
  };

  return borrowerPortfolioStepIds.filter((step) =>
    isBorrowerPortfolioStepComplete(step, candidate),
  );
}

export function getNextIncompleteBorrowerPortfolioStep(
  portfolio: Partial<BorrowerPortfolioInput> | null,
): BorrowerPortfolioStep {
  const completed = new Set(getCompletedBorrowerPortfolioSteps(portfolio));

  return (
    borrowerPortfolioStepIds.find((step) => !completed.has(step)) ?? "review"
  );
}

export function isBorrowerPortfolioComplete(
  portfolio: Partial<BorrowerPortfolioInput> | null,
) {
  const candidate = {
    ...getBorrowerPortfolioDefaultValues(),
    ...portfolio,
  };

  return borrowerPortfolioStepIds.every(
    (step) => isBorrowerPortfolioStepComplete(step, candidate),
  );
}

function isBorrowerPortfolioStepComplete(
  step: BorrowerPortfolioStep,
  portfolio: BorrowerPortfolioInput,
) {
  if (!borrowerPortfolioStepSchemas[step].safeParse(portfolio).success) {
    return false;
  }

  if (step === "businessExpenses") {
    return portfolio.businessExpensesCompleted;
  }

  if (step === "householdExpenses") {
    return portfolio.householdExpensesCompleted;
  }

  if (step === "existingDebts") {
    return portfolio.existingDebtDeclarationCompleted;
  }

  if (step === "assets") {
    return portfolio.assetDeclarationCompleted;
  }

  if (step === "loanUse") {
    return portfolio.loanRequestCompleted;
  }

  return true;
}

type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];

export function getBorrowerPortfolioDefaultValues(): BorrowerPortfolioInput {
  return borrowerPortfolioBaseSchema.parse({});
}

const debtPaymentFieldNames = [
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
] as const satisfies ReadonlyArray<keyof BorrowerPortfolioInput>;

const assetValueFieldNames = [
  "cashOnHand",
  "bankSavings",
  "ewalletBalance",
  "inventoryValue",
  "businessEquipmentValue",
  "vehicleValue",
  "propertyLandValue",
  "otherAssetsValue",
] as const satisfies ReadonlyArray<keyof BorrowerPortfolioInput>;

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
  if (!portfolio.hasExistingDebts) return 0;

  return sumFields(portfolio, debtPaymentFieldNames);
}

export function normalizeDebtPaymentValues(
  portfolio: Partial<Record<keyof BorrowerPortfolioInput, unknown>>,
) {
  if (portfolio.hasExistingDebts) return {};

  return {
    personalLoanPayments: 0,
    businessLoanPayments: 0,
    vehicleLoanPayments: 0,
    homeLoanPayments: 0,
    lendingAppPayments: 0,
    informalLoanPayments: 0,
    buyNowPayLaterPayments: 0,
    creditCardPayments: 0,
    coMakerGuaranteedLoanPayments: 0,
    otherDebtPayments: 0,
    existingLoanPayments: 0,
  };
}

export function calculateTotalDeclaredAssets(
  portfolio: Partial<Record<keyof BorrowerPortfolioInput, unknown>>,
): number {
  return sumFields(portfolio, assetValueFieldNames);
}

export function copyHomeAddressToBusinessAddress(
  homeAddressSelection: Partial<PhilippineAddressSelection> | null | undefined,
  homeStreetAddress: string | null | undefined,
) {
  return {
    regionCode: homeAddressSelection?.regionCode ?? "",
    regionName: homeAddressSelection?.regionName ?? "",
    cityOrMunicipality: homeAddressSelection?.cityOrMunicipality ?? "",
    barangay: homeAddressSelection?.barangay ?? "",
    zipCode: homeAddressSelection?.zipCode ?? "",
    streetAddress: homeStreetAddress?.trim() ?? "",
  };
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
  const parsedHomeAddress = parseLegacyAddress(row.home_address ?? "");
  const expenseBreakdown = asRecord(row.expense_breakdown);
  const debtSummary = asRecord(row.debt_obligation_summary);
  const personalLoanPayments = numberFrom(row.personal_loan_payments);
  const businessLoanPayments = numberFrom(row.business_loan_payments);
  const vehicleLoanPayments = numberFrom(row.vehicle_loan_payments);
  const homeLoanPayments = numberFrom(row.home_loan_payments);
  const lendingAppPayments = numberFrom(row.lending_app_payments);
  const informalLoanPayments = numberFrom(row.informal_loan_payments);
  const buyNowPayLaterPayments = numberFrom(row.buy_now_pay_later_payments);
  const creditCardPayments = numberFrom(row.credit_card_payments);
  const coMakerGuaranteedLoanPayments = numberFrom(
    row.co_maker_guaranteed_loan_payments,
  );
  const otherDebtPayments = numberFrom(
    row.other_debt_payments,
    debtSummary.total_outstanding_debt,
  );
  const existingLoanPayments = toNumber(row.existing_loan_payments);
  const cashOnHand = toNumber(row.cash_on_hand);
  const bankSavings = toNumber(row.bank_savings);
  const ewalletBalance = toNumber(row.ewallet_balance);
  const inventoryValue = toNumber(row.inventory_value);
  const hasInventory =
    row.has_inventory ?? (inventoryValue > 0 ? true : null);
  const businessEquipmentValue = toNumber(row.business_equipment_value);
  const vehicleValue = toNumber(row.vehicle_value);
  const propertyLandValue = toNumber(row.property_land_value);
  const otherAssetsValue = toNumber(row.other_assets_value);
  const hasSavedDebtValues =
    Boolean(row.has_existing_debts) ||
    Boolean(debtSummary.has_existing_debts) ||
    [
      personalLoanPayments,
      businessLoanPayments,
      vehicleLoanPayments,
      homeLoanPayments,
      lendingAppPayments,
      informalLoanPayments,
      buyNowPayLaterPayments,
      creditCardPayments,
      coMakerGuaranteedLoanPayments,
      otherDebtPayments,
      existingLoanPayments,
    ].some((value) => value > 0);
  const hasSavedAssetValues = [
    cashOnHand,
    bankSavings,
    ewalletBalance,
    inventoryValue,
    businessEquipmentValue,
    vehicleValue,
    propertyLandValue,
    otherAssetsValue,
  ].some((value) => value > 0);

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
    homeAddressSelection: {
      regionCode: parsedHomeAddress?.regionCode ?? "",
      regionName: parsedHomeAddress?.regionName ?? "",
      cityOrMunicipality: parsedHomeAddress?.cityOrMunicipality ?? "",
      barangay: parsedHomeAddress?.barangay ?? "",
      zipCode: parsedHomeAddress?.zipCode ?? "",
    },
    homeStreetAddress: deriveLegacyStreetAddress(
      row.home_address ?? "",
      parsedHomeAddress,
    ),
    yearsAtCurrentAddress: toNumber(row.years_at_current_address),
    emergencyContactName: stringFrom(row.emergency_contact_name),
    emergencyContactNumber: stringFrom(row.emergency_contact_number),
    emergencyContactRelationship: stringFrom(
      row.emergency_contact_relationship,
    ),
    businessName: row.business_name ?? "",
    businessType: mapBusinessType(row.business_type),
    location: row.location === draftLocationPlaceholder ? "" : row.location ?? "",
    businessAddress: row.business_address ?? "",
    country: "Philippines" as const,
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
    ...parseMainProductsOrServices(row.main_products_or_services),
    mainProductsOrServices: stringFrom(row.main_products_or_services),
    mainSuppliers: stringFrom(row.main_suppliers),
    keepsSalesRecords: Boolean(row.keeps_sales_records),
    usesBankOrEwallet: Boolean(row.uses_bank_or_ewallet),
    offersCustomerCredit: Boolean(row.offers_customer_credit),
    hasBusinessRegistration: Boolean(
      row.business_registration_type ||
        row.registration_number ||
        row.registration_date,
    ),
    businessRegistrationType: mapNullableOption(
      row.business_registration_type,
      businessRegistrationTypeOptions,
    ),
    registrationNumber: stringFrom(row.registration_number),
    registrationDate: stringFrom(row.registration_date),
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
    businessExpensesCompleted: Boolean(row.business_expenses_completed),
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
    hasExistingDebts: hasSavedDebtValues,
    personalLoanPayments,
    businessLoanPayments,
    vehicleLoanPayments,
    homeLoanPayments,
    lendingAppPayments,
    informalLoanPayments,
    buyNowPayLaterPayments,
    creditCardPayments,
    coMakerGuaranteedLoanPayments,
    otherDebtPayments,
    existingLoanPayments,
    existingDebtDeclarationCompleted: Boolean(
      row.existing_debt_declaration_completed || hasSavedDebtValues,
    ),
    assetDeclarationCompleted: Boolean(
      row.asset_declaration_completed ||
        row.existing_debt_declaration_completed ||
        hasSavedAssetValues,
    ),
    hasInventory,
    cashOnHand,
    bankSavings,
    ewalletBalance,
    inventoryValue: hasInventory === true ? inventoryValue : 0,
    businessEquipmentValue,
    vehicleValue,
    propertyLandValue,
    otherAssetsValue,
    loanRequestCompleted: Boolean(row.loan_request_completed),
    estimatedCustomerCreditAmount: toNumber(row.estimated_customer_credit_amount),
    averageCollectionPeriod: mapNullableOption(
      row.average_collection_period,
      averageCollectionPeriodOptions,
    ),
    keepsCustomerDebtList: row.keeps_customer_debt_list,
    ...parseLoanPurposeContext(row.loan_purpose_context ?? ""),
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

  return borrowerPortfolioBaseSchema.parse(
    backfillDetailedTotals({
      ...mapped,
      ...normalizeBorrowerBusinessRegistrationFields(mapped),
      businessTemporarilyStopped:
        mapped.confirmsBusinessOperating && mapped.businessTemporarilyStopped
          ? false
          : mapped.businessTemporarilyStopped,
    }),
  );
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
  if (input.operatingModel === "online_only") {
    return {
      location: "Online only",
      businessAddress: null,
      barangay: null,
      cityOrMunicipality: null,
      region: null,
      zipCode: null,
    };
  }

  if (input.isBusinessAddressSameAsHome) {
    const homeAddress = formatHomeAddress(input);

    return {
      location: homeAddress || draftLocationPlaceholder,
      businessAddress: input.homeStreetAddress?.trim() || null,
      barangay: input.homeAddressSelection.barangay || null,
      cityOrMunicipality:
        input.homeAddressSelection.cityOrMunicipality || null,
      region: input.homeAddressSelection.regionCode || null,
      zipCode: input.homeAddressSelection.zipCode || null,
    };
  }

  const hasStructuredAddress =
    input.address.regionCode &&
    input.address.cityOrMunicipality &&
    input.address.barangay &&
    input.address.zipCode;
  const regionName = input.address.regionName || input.address.regionCode;
  const formatted = hasStructuredAddress
    ? [
        input.address.barangay,
        input.address.cityOrMunicipality,
        regionName,
        input.country,
      ]
        .filter(Boolean)
        .join(", ")
    : (input.location ?? "").trim();
  const businessAddress = resolveStreetAddressValue(input);

  return {
    location: formatted || draftLocationPlaceholder,
    businessAddress: businessAddress || null,
    barangay: input.address.barangay || null,
    cityOrMunicipality: input.address.cityOrMunicipality || null,
    region: input.address.regionCode || null,
    zipCode: input.address.zipCode || null,
  };
}

export function normalizeBorrowerBusinessAddressFields<
  T extends Partial<BorrowerPortfolioFormInput>,
>(input: T): T {
  const copiedHomeAddress = input.isBusinessAddressSameAsHome
    ? copyHomeAddressToBusinessAddress(
        input.homeAddressSelection,
        input.homeStreetAddress,
      )
    : null;
  const address = copiedHomeAddress
    ? {
        ...(input.address ?? emptyAddressSelection),
        regionCode: copiedHomeAddress.regionCode,
        regionName: copiedHomeAddress.regionName,
        cityOrMunicipality: copiedHomeAddress.cityOrMunicipality,
        barangay: copiedHomeAddress.barangay,
        zipCode: copiedHomeAddress.zipCode,
      }
    : input.address;
  const streetAddress =
    (typeof input.streetAddress === "string" ? input.streetAddress.trim() : "") ||
    (typeof input.businessAddress === "string"
      ? input.businessAddress.trim()
      : "") ||
    copiedHomeAddress?.streetAddress ||
    (typeof input.homeStreetAddress === "string"
      ? input.homeStreetAddress.trim()
      : "");

  return {
    ...input,
    address,
    businessAddress: streetAddress,
    streetAddress,
  };
}

function resolveStreetAddressValue(
  input: Partial<
    Pick<BorrowerPortfolioFormInput, "businessAddress" | "streetAddress">
  >,
) {
  return (
    (typeof input.streetAddress === "string" ? input.streetAddress.trim() : "") ||
    (typeof input.businessAddress === "string"
      ? input.businessAddress.trim()
      : "")
  );
}

export function isPhysicalBusinessAddressRequired(
  operatingModel: BorrowerPortfolioInput["operatingModel"],
) {
  return operatingModel !== "online_only";
}

export function formatHomeAddress(
  input: Pick<
    BorrowerPortfolioInput,
    "homeAddressSelection" | "homeStreetAddress" | "homeAddress"
  >,
) {
  if (isValidPhilippineAddressSelection(input.homeAddressSelection)) {
    return formatPhilippineAddress(
      input.homeAddressSelection,
      input.homeStreetAddress,
    );
  }

  return input.homeAddress?.trim() ?? "";
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

export const mainProductsOrServicesCategoryLabels = {
  groceries_household_items: "Groceries and household items",
  food_beverages: "Food and beverages",
  cooked_food_carinderia: "Cooked food / carinderia",
  mobile_load_ewallet_services: "Mobile load / e-wallet services",
  personal_care_products: "Personal care products",
  clothing_accessories: "Clothing / accessories",
  repair_or_local_services: "Repair or local services",
  online_selling_products: "Online selling products",
  agriculture_fish_meat_produce: "Agriculture / fish / meat / produce",
  other: "Other",
} satisfies Record<
  (typeof mainProductsOrServicesCategoryOptions)[number],
  string
>;

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

export const loanPurposeCategoryLabels = {
  inventory_stock: "Inventory / stock",
  equipment: "Equipment",
  stall_store_improvement: "Stall or store improvement",
  working_capital: "Working capital",
  rent_utilities: "Rent / utilities",
  marketing: "Marketing",
  debt_consolidation: "Debt consolidation",
  emergency_repair: "Emergency repair",
  other: "Other",
} satisfies Record<(typeof loanPurposeCategoryOptions)[number], string>;

export function formatLoanPurposeContext(
  value: Pick<
    BorrowerPortfolioFormInput,
    "loanPurposeCategory" | "loanPurposeOther" | "loanPurposeDetails" | "loanPurposeContext"
  >,
  options: { preferSelectedCategory?: boolean } = {},
) {
  const category =
    value.loanPurposeCategory === "other"
      ? value.loanPurposeOther?.trim()
      : value.loanPurposeCategory
        ? loanPurposeCategoryLabels[value.loanPurposeCategory]
        : "";
  const details = value.loanPurposeDetails?.trim();
  const existingContext = value.loanPurposeContext?.trim();

  if (category && details) return `${category}: ${details}`;
  if (!options.preferSelectedCategory && existingContext) {
    return existingContext;
  }
  if (category) return category;
  if (existingContext) return existingContext;

  return "";
}

export function resolveMainProductsOrServicesValue(
  value: Pick<
    BorrowerPortfolioFormInput,
    | "mainProductsOrServicesCategory"
    | "mainProductsOrServicesOther"
    | "mainProductsOrServices"
  >,
) {
  if (value.mainProductsOrServicesCategory === "other") {
    return value.mainProductsOrServicesOther?.trim() ?? "";
  }

  if (value.mainProductsOrServicesCategory) {
    return mainProductsOrServicesCategoryLabels[value.mainProductsOrServicesCategory];
  }

  return value.mainProductsOrServices?.trim() ?? "";
}

function parseMainProductsOrServices(
  value: string | null | undefined,
): Pick<
  BorrowerPortfolioFormInput,
  | "mainProductsOrServicesCategory"
  | "mainProductsOrServicesOther"
> {
  const trimmed = value?.trim() ?? "";
  const matchedCategory = mainProductsOrServicesCategoryOptions.find(
    (option) => mainProductsOrServicesCategoryLabels[option] === trimmed,
  );

  if (matchedCategory) {
    return {
      mainProductsOrServicesCategory: matchedCategory,
      mainProductsOrServicesOther: "",
    };
  }

  if (trimmed) {
    return {
      mainProductsOrServicesCategory: "other",
      mainProductsOrServicesOther: trimmed.slice(0, 120),
    };
  }

  return {
    mainProductsOrServicesCategory: null,
    mainProductsOrServicesOther: "",
  };
}

function parseLoanPurposeContext(value: string): Pick<
  BorrowerPortfolioFormInput,
  "loanPurposeContext" | "loanPurposeCategory" | "loanPurposeOther" | "loanPurposeDetails"
> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      loanPurposeContext: "",
      loanPurposeCategory: null,
      loanPurposeOther: "",
      loanPurposeDetails: "",
    };
  }

  const matchingCategory = loanPurposeCategoryOptions.find(
    (option) =>
      loanPurposeCategoryLabels[option].toLowerCase() ===
        trimmed.toLowerCase() ||
      option === trimmed ||
      option.replace(/_/g, " ") === trimmed.toLowerCase(),
  );
  const [rawCategory, ...detailParts] = trimmed.split(":");
  const categoryFromPrefix = loanPurposeCategoryOptions.find(
    (option) =>
      loanPurposeCategoryLabels[option].toLowerCase() ===
        rawCategory.trim().toLowerCase() ||
      option === rawCategory.trim() ||
      option.replace(/_/g, " ") === rawCategory.trim().toLowerCase(),
  );

  if (categoryFromPrefix) {
    return {
      loanPurposeContext: trimmed,
      loanPurposeCategory: categoryFromPrefix,
      loanPurposeOther: "",
      loanPurposeDetails: detailParts.join(":").trim(),
    };
  }

  if (matchingCategory) {
    return {
      loanPurposeContext: trimmed,
      loanPurposeCategory: matchingCategory,
      loanPurposeOther: "",
      loanPurposeDetails: "",
    };
  }

  return {
    loanPurposeContext: trimmed,
    loanPurposeCategory: "other",
    loanPurposeOther: trimmed.slice(0, 80),
    loanPurposeDetails: "",
  };
}

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
  fields: readonly string[],
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

function deriveLegacyStreetAddress(
  address: string,
  parsedAddress: Partial<PhilippineAddressSelection> | null,
) {
  if (!address || !parsedAddress) return "";

  const firstStructuredPart = [
    parsedAddress.barangay,
    parsedAddress.cityOrMunicipality,
    parsedAddress.regionName,
    parsedAddress.zipCode,
  ].find(Boolean);

  if (!firstStructuredPart) return "";

  return address.split(firstStructuredPart)[0]?.replace(/,\s*$/, "").trim() ?? "";
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

import { z } from "zod";
import type { Database } from "@/lib/supabase/types";
import {
  isValidPhilippineAddressSelection,
  formatPhilippineAddress,
} from "@/lib/philippine-addresses";
import type { PhilippineAddressSelection } from "@/lib/philippine-addresses";

export const businessTypeOptions = [
  "sari_sari_store",
  "food_stall",
  "online_seller",
  "market_vendor",
  "service_provider",
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
      return undefined;
    }

    const parsedValue = Number(normalizedValue);

    return Number.isNaN(parsedValue) ? value : parsedValue;
  }

  return value;
}

function requiredNumber(schema: z.ZodNumber) {
  return z.preprocess((value) => {
    return normalizeNumberInput(value);
  }, schema);
}

const addressSelectionSchema = z
  .object({
    regionCode: z.string().min(1, "Select your region."),
    regionName: z.string().min(1),
    cityOrMunicipality: z.string().min(1, "Select your city or municipality."),
    barangay: z.string().min(1, "Select your barangay."),
    zipCode: z.string().min(1, "ZIP code is required."),
  })
  .superRefine((value, context) => {
    if (!isValidPhilippineAddressSelection(value)) {
      context.addIssue({
        code: "custom",
        path: ["regionCode"],
        message:
          "The selected region, city, barangay, and ZIP code combination is not valid.",
      });
    }
  });

export const borrowerPortfolioSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Enter the registered or public business name.")
    .max(120, "Keep the business name under 120 characters."),
  businessType: z.enum(businessTypeOptions, {
    error: "Select the closest business type.",
  }),
  location: z
    .string()
    .trim()
    .min(3, "Enter the city or barangay where the business operates.")
    .max(120, "Keep the location under 120 characters."),
  address: addressSelectionSchema,
  streetAddress: z
    .string()
    .trim()
    .max(240, "Street address must be 240 characters or fewer.")
    .optional()
    .or(z.literal("")),
  monthlyGrossRevenue: requiredNumber(
    z
      .number({ error: "Enter monthly gross revenue." })
      .min(0, "Revenue cannot be negative.")
      .max(10_000_000, "Revenue must be below PHP 10,000,000."),
  ),
  monthlyExpenses: requiredNumber(
    z
      .number({ error: "Enter monthly expenses." })
      .min(0, "Expenses cannot be negative.")
      .max(10_000_000, "Expenses must be below PHP 10,000,000."),
  ),
  existingLoanPayments: requiredNumber(
    z
      .number({ error: "Enter existing monthly loan payments." })
      .min(0, "Existing loan payments cannot be negative.")
      .max(10_000_000, "Existing loan payments must be below PHP 10,000,000."),
  ),
  yearsInOperation: requiredNumber(
    z
      .number({ error: "Enter years in operation." })
      .min(0, "Years in operation cannot be negative.")
      .max(100, "Years in operation must be 100 or less."),
  ),
  loanPurposeContext: z
    .string()
    .trim()
    .max(800, "Keep the loan purpose context under 800 characters."),
});

export type BorrowerPortfolioInput = z.infer<typeof borrowerPortfolioSchema>;
export type BorrowerPortfolioFormInput = z.input<typeof borrowerPortfolioSchema>;

type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];

export function mapBorrowerPortfolioRow(
  row: BorrowerPortfolioRow,
): BorrowerPortfolioInput {
  const regionCode = row.region ?? "";
  const cityOrMunicipality = row.city_or_municipality ?? "";
  const barangay = row.barangay ?? "";
  const zipCode = row.zip_code ?? "";

  const address: PhilippineAddressSelection = {
    regionCode,
    regionName: regionCode,
    cityOrMunicipality,
    barangay,
    zipCode,
  };

  return {
    businessName: row.business_name ?? "",
    businessType: isBusinessType(row.business_type)
      ? row.business_type
      : "other",
    location: row.location ?? "",
    address,
    streetAddress: row.business_address ?? "",
    monthlyGrossRevenue: toNumber(row.monthly_gross_revenue),
    monthlyExpenses: toNumber(row.monthly_expenses),
    existingLoanPayments: toNumber(row.existing_loan_payments),
    yearsInOperation: toNumber(row.years_in_operation),
    loanPurposeContext: row.loan_purpose_context ?? "",
  };
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
  const formatted = formatPhilippineAddress(
    input.address,
    input.streetAddress || undefined,
  );

  return {
    location: formatted,
    businessAddress: input.streetAddress?.trim() || null,
    barangay: input.address.barangay,
    cityOrMunicipality: input.address.cityOrMunicipality,
    region: input.address.regionCode,
    zipCode: input.address.zipCode,
  };
}

export const businessTypeLabels: Record<
  (typeof businessTypeOptions)[number],
  string
> = {
  sari_sari_store: "Sari-sari store",
  food_stall: "Food stall or carinderia",
  online_seller: "Online seller",
  market_vendor: "Market vendor",
  service_provider: "Service provider",
  other: "Other microbusiness",
};

function isBusinessType(value: unknown): value is (typeof businessTypeOptions)[number] {
  return businessTypeOptions.some((option) => option === value);
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

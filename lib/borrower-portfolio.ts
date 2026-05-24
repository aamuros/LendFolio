import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

export const businessTypeOptions = [
  "sari_sari_store",
  "food_stall",
  "online_seller",
  "market_vendor",
  "service_provider",
  "other",
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

export const borrowerPortfolioSchema = z.object({
  businessType: z.enum(businessTypeOptions, {
    error: "Select the closest business type.",
  }),
  location: z
    .string()
    .trim()
    .min(3, "Enter the city or barangay where the business operates.")
    .max(120, "Keep the location under 120 characters."),
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
    .min(20, "Add at least 20 characters of context.")
    .max(800, "Keep the loan purpose context under 800 characters."),
});

export type BorrowerPortfolioInput = z.infer<typeof borrowerPortfolioSchema>;
export type BorrowerPortfolioFormInput = z.input<typeof borrowerPortfolioSchema>;

type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];

export function mapBorrowerPortfolioRow(
  row: BorrowerPortfolioRow,
): BorrowerPortfolioInput {
  return {
    businessType: row.business_type,
    location: row.location,
    monthlyGrossRevenue: row.monthly_gross_revenue,
    monthlyExpenses: row.monthly_expenses,
    existingLoanPayments: row.existing_loan_payments,
    yearsInOperation: row.years_in_operation,
    loanPurposeContext: row.loan_purpose_context,
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

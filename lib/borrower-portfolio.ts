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

export const operatingModelOptions = [
  "fixed_store",
  "market_stall",
  "home_based",
  "online",
  "mobile",
  "mixed",
  "other",
] as const;

export const primarySalesChannelOptions = [
  "walk_in",
  "online_marketplace",
  "social_media",
  "delivery_apps",
  "wholesale",
  "mixed",
  "other",
] as const;

export const revenuePeriodOptions = [
  "last_30_days",
  "average_monthly_last_3_months",
  "average_monthly_last_6_months",
  "seasonal_estimate",
] as const;

export const revenueConfidenceOptions = [
  "self_declared",
  "partially_documented",
  "document_supported",
  "manager_reviewed",
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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));

const dateNotInFuture = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    return !Number.isNaN(date.getTime()) && date <= today;
  }, "Business start date cannot be in the future.");

export const borrowerPortfolioSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Enter the registered or public business name.")
    .max(120, "Keep the business name under 120 characters."),
  businessDescription: z
    .string()
    .trim()
    .min(20, "Describe what the business sells or provides.")
    .max(1000, "Keep the business description under 1,000 characters."),
  businessType: z.enum(businessTypeOptions, {
    error: "Select the closest business type.",
  }),
  startedOperatingAt: dateNotInFuture,
  businessAddress: z
    .string()
    .trim()
    .min(5, "Enter the business address.")
    .max(240, "Keep the address under 240 characters."),
  barangay: z
    .string()
    .trim()
    .min(2, "Enter the barangay.")
    .max(120, "Keep the barangay under 120 characters."),
  cityOrMunicipality: z
    .string()
    .trim()
    .min(2, "Enter the city or municipality.")
    .max(120, "Keep the city or municipality under 120 characters."),
  province: z
    .string()
    .trim()
    .min(2, "Enter the province.")
    .max(120, "Keep the province under 120 characters."),
  location: z
    .string()
    .trim()
    .min(3, "Enter the city or barangay where the business operates.")
    .max(120, "Keep the location under 120 characters."),
  operatingModel: z.enum(operatingModelOptions, {
    error: "Select how the business operates.",
  }),
  primarySalesChannel: z.enum(primarySalesChannelOptions, {
    error: "Select the main sales channel.",
  }),
  revenuePeriod: z.enum(revenuePeriodOptions, {
    error: "Select the revenue period.",
  }),
  revenueConfidence: z.enum(revenueConfidenceOptions, {
    error: "Select how confident this revenue figure is.",
  }),
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
  inventoryExpense: requiredNumber(
    z.number({ error: "Enter inventory or cost of goods." }).min(0).max(10_000_000),
  ),
  rentExpense: requiredNumber(
    z.number({ error: "Enter rent expense." }).min(0).max(10_000_000),
  ),
  payrollExpense: requiredNumber(
    z.number({ error: "Enter payroll expense." }).min(0).max(10_000_000),
  ),
  utilitiesExpense: requiredNumber(
    z.number({ error: "Enter utilities expense." }).min(0).max(10_000_000),
  ),
  otherExpense: requiredNumber(
    z.number({ error: "Enter other expense." }).min(0).max(10_000_000),
  ),
  debtLenderCount: requiredNumber(
    z.number({ error: "Enter number of active lenders." }).int().min(0).max(50),
  ),
  totalOutstandingDebt: requiredNumber(
    z.number({ error: "Enter total outstanding debt." }).min(0).max(10_000_000),
  ),
  debtNotes: optionalText(500),
  loanPurposeContext: z
    .string()
    .trim()
    .min(20, "Add at least 20 characters of context.")
    .max(800, "Keep the loan purpose context under 800 characters."),
});

export type BorrowerPortfolioInput = z.infer<typeof borrowerPortfolioSchema>;
export type BorrowerPortfolioFormInput = z.input<typeof borrowerPortfolioSchema>;

export type BorrowerPortfolioExpenseBreakdown = {
  inventory: number;
  rent: number;
  payroll: number;
  utilities: number;
  other: number;
};

export type BorrowerPortfolioDebtSummary = {
  activeLenderCount: number;
  totalOutstandingDebt: number;
  notes: string;
};

type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];

export function mapBorrowerPortfolioRow(
  row: BorrowerPortfolioRow,
): BorrowerPortfolioInput {
  const expenseBreakdown = toRecord(row.expense_breakdown);
  const debtSummary = toRecord(row.debt_obligation_summary);

  return {
    businessName: row.business_name ?? "",
    businessDescription: row.business_description ?? "",
    businessType: row.business_type,
    startedOperatingAt: row.started_operating_at ?? "",
    businessAddress: row.business_address ?? "",
    barangay: row.barangay ?? "",
    cityOrMunicipality: row.city_or_municipality ?? "",
    province: row.province ?? "",
    location: row.location,
    operatingModel: row.operating_model ?? "other",
    primarySalesChannel: row.primary_sales_channel ?? "other",
    revenuePeriod: row.revenue_period ?? "last_30_days",
    revenueConfidence: row.revenue_confidence ?? "self_declared",
    monthlyGrossRevenue: row.monthly_gross_revenue,
    monthlyExpenses: row.monthly_expenses,
    existingLoanPayments: row.existing_loan_payments,
    yearsInOperation: row.years_in_operation,
    inventoryExpense: toNumber(expenseBreakdown.inventory),
    rentExpense: toNumber(expenseBreakdown.rent),
    payrollExpense: toNumber(expenseBreakdown.payroll),
    utilitiesExpense: toNumber(expenseBreakdown.utilities),
    otherExpense: toNumber(expenseBreakdown.other),
    debtLenderCount: toNumber(debtSummary.active_lender_count),
    totalOutstandingDebt: toNumber(debtSummary.total_outstanding_debt),
    debtNotes: typeof debtSummary.notes === "string" ? debtSummary.notes : "",
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

export const operatingModelLabels: Record<
  (typeof operatingModelOptions)[number],
  string
> = {
  fixed_store: "Fixed store",
  market_stall: "Market stall",
  home_based: "Home-based",
  online: "Online",
  mobile: "Mobile",
  mixed: "Mixed",
  other: "Other",
};

export const primarySalesChannelLabels: Record<
  (typeof primarySalesChannelOptions)[number],
  string
> = {
  walk_in: "Walk-in",
  online_marketplace: "Online marketplace",
  social_media: "Social media",
  delivery_apps: "Delivery apps",
  wholesale: "Wholesale",
  mixed: "Mixed",
  other: "Other",
};

export const revenuePeriodLabels: Record<
  (typeof revenuePeriodOptions)[number],
  string
> = {
  last_30_days: "Last 30 days",
  average_monthly_last_3_months: "Average monthly, last 3 months",
  average_monthly_last_6_months: "Average monthly, last 6 months",
  seasonal_estimate: "Seasonal estimate",
};

export const revenueConfidenceLabels: Record<
  (typeof revenueConfidenceOptions)[number],
  string
> = {
  self_declared: "Self-declared",
  partially_documented: "Partially documented",
  document_supported: "Document-supported",
  manager_reviewed: "Manager reviewed",
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

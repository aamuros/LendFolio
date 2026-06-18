import { z } from "zod";
import type {
  BorrowerCreditProfileAssessment,
  BorrowerCreditProfileGrade,
} from "@/lib/borrower-credit-profile-grade";
import type { Database } from "@/lib/supabase/types";

export const preferredTermOptions = [
  "1_month",
  "3_months",
  "6_months",
  "12_months",
] as const;

export const loanPurposeOptions = [
  "Inventory purchase",
  "Online business expansion",
  "Equipment purchase",
  "Working capital",
  "Store renovation",
  "Marketing or promotion",
  "Supplier payment",
  "Emergency business expense",
  "Other business need",
] as const;

export type LoanPurpose = (typeof loanPurposeOptions)[number];

export const loanPurposeLabels: Record<
  LoanPurpose,
  string
> = Object.fromEntries(
  loanPurposeOptions.map((option) => [option, option]),
) as Record<LoanPurpose, string>;

export function getLoanPurposeLabel(purpose: string) {
  return purpose in loanPurposeLabels
    ? loanPurposeLabels[purpose as LoanPurpose]
    : purpose;
}

export function isLoanPurposeOption(
  purpose: string,
): purpose is LoanPurpose {
  return loanPurposeOptions.includes(purpose as LoanPurpose);
}

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

export const loanApplicationSchema = z.object({
  requestedAmount: requiredNumber(
    z
      .number({ error: "Enter the requested loan amount." })
      .min(1_000, "Requested amount must be at least PHP 1,000.")
      .max(1_000_000, "Requested amount must be PHP 1,000,000 or less."),
  ),
  purpose: z
    .string()
    .trim()
    .refine(isLoanPurposeOption, "Select loan purpose.")
    .transform((purpose) => purpose as LoanPurpose),
  preferredTerm: z.enum(preferredTermOptions, {
    error: "Select a preferred repayment term.",
  }),
  remarks: z
    .string()
    .trim()
    .max(500, "Keep remarks under 500 characters.")
    .optional()
    .or(z.literal("")),
});

export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>;
export type LoanApplicationFormInput = z.input<typeof loanApplicationSchema>;

export type LoanApplicationSummary = {
  id: string;
  requestedAmount: number;
  creditLimitAtSubmission: number | null;
  usedCreditAtSubmission: number | null;
  availableCreditAtSubmission: number | null;
  monthlyNetCashFlowAtSubmission: number | null;
  creditReadinessStatus: Database["public"]["Enums"]["borrower_credit_readiness_status"] | null;
  borrowerProfileSnapshot: Database["public"]["Tables"]["loan_applications"]["Row"]["borrower_profile_snapshot"];
  borrowerReadinessSnapshot: Database["public"]["Tables"]["loan_applications"]["Row"]["borrower_readiness_snapshot"];
  creditProfileGrade: BorrowerCreditProfileGrade | null;
  creditProfileAssessment: BorrowerCreditProfileAssessment | null;
  purpose: string;
  preferredTerm: (typeof preferredTermOptions)[number];
  remarks: string | null;
  status: Database["public"]["Enums"]["application_status"];
  submittedAt: string;
  borrowerRemovedAt: string | null;
};

type LoanApplicationRow =
  Omit<
    Database["public"]["Tables"]["loan_applications"]["Row"],
    | "credit_limit_at_submission"
    | "used_credit_at_submission"
    | "available_credit_at_submission"
    | "monthly_net_cash_flow_at_submission"
    | "credit_readiness_status"
    | "borrower_profile_snapshot"
    | "borrower_readiness_snapshot"
    | "borrower_credit_profile_grade"
    | "borrower_credit_profile_assessment"
    | "borrower_removed_at"
  > &
    Partial<
      Pick<
        Database["public"]["Tables"]["loan_applications"]["Row"],
        | "credit_limit_at_submission"
        | "used_credit_at_submission"
        | "available_credit_at_submission"
        | "monthly_net_cash_flow_at_submission"
        | "credit_readiness_status"
        | "borrower_profile_snapshot"
        | "borrower_readiness_snapshot"
        | "borrower_credit_profile_grade"
        | "borrower_credit_profile_assessment"
        | "borrower_removed_at"
      >
    >;

export function mapLoanApplicationRow(
  row: LoanApplicationRow,
): LoanApplicationSummary {
  return {
    id: row.id,
    requestedAmount: row.requested_amount,
    creditLimitAtSubmission: row.credit_limit_at_submission ?? null,
    usedCreditAtSubmission: row.used_credit_at_submission ?? null,
    availableCreditAtSubmission: row.available_credit_at_submission ?? null,
    monthlyNetCashFlowAtSubmission:
      row.monthly_net_cash_flow_at_submission ?? null,
    creditReadinessStatus: row.credit_readiness_status ?? null,
    borrowerProfileSnapshot: row.borrower_profile_snapshot ?? null,
    borrowerReadinessSnapshot: row.borrower_readiness_snapshot ?? null,
    creditProfileGrade: parseCreditProfileGrade(row.borrower_credit_profile_grade),
    creditProfileAssessment: parseCreditProfileAssessment(
      row.borrower_credit_profile_assessment,
    ),
    purpose: row.purpose,
    preferredTerm: row.preferred_term,
    remarks: row.remarks,
    status: row.status,
    submittedAt: row.submitted_at,
    borrowerRemovedAt: row.borrower_removed_at ?? null,
  };
}

function parseCreditProfileGrade(
  value: string | null | undefined,
): BorrowerCreditProfileGrade | null {
  if (!value) return null;

  const validGrades: BorrowerCreditProfileGrade[] = [
    "A",
    "B",
    "C",
    "review_needed",
    "not_eligible",
    "incomplete",
  ];

  return validGrades.includes(value as BorrowerCreditProfileGrade)
    ? (value as BorrowerCreditProfileGrade)
    : null;
}

function parseCreditProfileAssessment(
  value: Database["public"]["Tables"]["loan_applications"]["Row"]["borrower_credit_profile_assessment"] | undefined,
): BorrowerCreditProfileAssessment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.grade !== "string" || typeof record.label !== "string") {
    return null;
  }

  return record as unknown as BorrowerCreditProfileAssessment;
}

export const preferredTermLabels: Record<
  (typeof preferredTermOptions)[number],
  string
> = {
  "1_month": "1 month",
  "3_months": "3 months",
  "6_months": "6 months",
  "12_months": "12 months",
};

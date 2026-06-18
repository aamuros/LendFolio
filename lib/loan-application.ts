import { z } from "zod";
import type {
  BorrowerCreditProfileAssessment,
  BorrowerCreditProfileGrade,
} from "@/lib/borrower-credit-profile-grade";
import { evaluateBorrowerCreditProfileGrade } from "@/lib/borrower-credit-profile-grade";
import type { BorrowerReadinessStatus } from "@/lib/borrower-readiness";
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
  creditProfileAssessmentSource: "stored" | "derived" | null;
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
  const storedGrade = parseCreditProfileGrade(row.borrower_credit_profile_grade);
  const storedAssessment = parseCreditProfileAssessment(
    row.borrower_credit_profile_assessment,
  );
  const fallbackAssessment =
    storedAssessment ?? deriveCreditProfileAssessment(row);

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
    creditProfileGrade:
      storedGrade ?? storedAssessment?.grade ?? fallbackAssessment?.grade ?? null,
    creditProfileAssessment: storedAssessment ?? fallbackAssessment,
    creditProfileAssessmentSource: storedAssessment
      ? "stored"
      : fallbackAssessment
        ? "derived"
        : null,
    purpose: row.purpose,
    preferredTerm: row.preferred_term,
    remarks: row.remarks,
    status: row.status,
    submittedAt: row.submitted_at,
    borrowerRemovedAt: row.borrower_removed_at ?? null,
  };
}

function deriveCreditProfileAssessment(
  row: LoanApplicationRow,
): BorrowerCreditProfileAssessment | null {
  const profileSnapshot = getJsonRecord(row.borrower_profile_snapshot);
  const readinessSnapshot = getJsonRecord(row.borrower_readiness_snapshot);
  const readinessStatus = parseReadinessStatus(
    row.credit_readiness_status ?? getString(readinessSnapshot?.readiness_status),
  );
  const calculatedCreditLimit =
    row.credit_limit_at_submission ??
    getNumber(readinessSnapshot?.calculated_credit_limit) ??
    getNumber(readinessSnapshot?.calculatedCreditLimit);
  const usedCredit =
    row.used_credit_at_submission ??
    getNumber(readinessSnapshot?.used_credit) ??
    getNumber(readinessSnapshot?.usedCredit) ??
    0;
  const availableCredit =
    row.available_credit_at_submission ??
    getNumber(readinessSnapshot?.available_credit) ??
    getNumber(readinessSnapshot?.availableCredit) ??
    (calculatedCreditLimit === undefined
      ? undefined
      : calculatedCreditLimit - usedCredit);

  if (
    !readinessStatus ||
    availableCredit === undefined ||
    calculatedCreditLimit === undefined
  ) {
    return null;
  }

  const riskFlags = getStringArray(
    readinessSnapshot?.risk_flags ??
      getJsonRecord(readinessSnapshot?.profile_readiness)?.risk_flags,
  );
  const nextActions = getStringArray(
    readinessSnapshot?.next_actions ?? readinessSnapshot?.nextActions,
  );
  const monthlyNetCashFlow =
    row.monthly_net_cash_flow_at_submission ??
    getNumber(profileSnapshot?.monthly_net_cash_flow) ??
    calculateSnapshotNetCashFlow(profileSnapshot);
  const monthlyGrossRevenue = getNumber(profileSnapshot?.monthly_gross_revenue);
  const existingLoanPayments = getNumber(profileSnapshot?.existing_loan_payments);
  const debtBurdenRatio =
    monthlyGrossRevenue && monthlyGrossRevenue > 0
      ? (existingLoanPayments ?? 0) / monthlyGrossRevenue
      : null;

  return evaluateBorrowerCreditProfileGrade({
    readiness: {
      readinessStatus,
      missingFields: getStringArray(
        readinessSnapshot?.missing_fields ?? readinessSnapshot?.missingFields,
      ),
      riskFlags,
      monthlyNetCashFlow,
      debtBurdenRatio,
      profileIsStale: Boolean(
        readinessSnapshot?.profile_is_stale ??
          readinessSnapshot?.profileIsStale,
      ),
      nextActions:
        nextActions.length > 0
          ? nextActions
          : buildFallbackNextActions(readinessStatus),
    },
    availableCredit,
    calculatedCreditLimit,
    usedCredit,
    yearsInOperation: getNumber(profileSnapshot?.years_in_operation),
    revenueConfidence: getString(profileSnapshot?.revenue_confidence),
    verificationStatus: getString(profileSnapshot?.profile_review_status),
  });
}

function parseReadinessStatus(
  value: string | null | undefined,
): BorrowerReadinessStatus | null {
  if (
    value === "incomplete" ||
    value === "complete" ||
    value === "needs_review" ||
    value === "not_eligible" ||
    value === "eligible_to_apply"
  ) {
    return value;
  }

  return null;
}

function getJsonRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function calculateSnapshotNetCashFlow(
  profileSnapshot: Record<string, unknown> | null,
) {
  const grossRevenue = getNumber(profileSnapshot?.monthly_gross_revenue) ?? 0;
  const expenses = getNumber(profileSnapshot?.monthly_expenses) ?? 0;
  const existingLoanPayments =
    getNumber(profileSnapshot?.existing_loan_payments) ?? 0;

  return grossRevenue - expenses - existingLoanPayments;
}

function buildFallbackNextActions(status: BorrowerReadinessStatus) {
  if (status === "incomplete") {
    return ["Complete the missing profile or verification requirements."];
  }

  if (status === "not_eligible") {
    return ["Resolve blocking credit or account issues before applying."];
  }

  if (status === "needs_review" || status === "complete") {
    return ["Review the submitted profile snapshot before making an offer."];
  }

  return [];
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

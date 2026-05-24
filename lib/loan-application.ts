import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

export const preferredTermOptions = [
  "1_month",
  "3_months",
  "6_months",
  "12_months",
] as const;

export const loanApplicationSchema = z.object({
  requestedAmount: z.coerce
    .number<number>({ error: "Enter the requested loan amount." })
    .min(1_000, "Requested amount must be at least PHP 1,000.")
    .max(1_000_000, "Requested amount must be PHP 1,000,000 or less."),
  purpose: z
    .string()
    .trim()
    .min(10, "Add a short purpose for this loan request.")
    .max(160, "Keep the purpose under 160 characters."),
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

export type LoanApplicationSummary = {
  id: string;
  requestedAmount: number;
  purpose: string;
  preferredTerm: (typeof preferredTermOptions)[number];
  remarks: string | null;
  status: "submitted" | "open";
  submittedAt: string;
};

type LoanApplicationRow =
  Database["public"]["Tables"]["loan_applications"]["Row"];

export function mapLoanApplicationRow(
  row: LoanApplicationRow,
): LoanApplicationSummary {
  return {
    id: row.id,
    requestedAmount: row.requested_amount,
    purpose: row.purpose,
    preferredTerm: row.preferred_term,
    remarks: row.remarks,
    status: row.status,
    submittedAt: row.submitted_at,
  };
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

import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

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

export const loanOfferSchema = z
  .object({
    approvedAmount: requiredNumber(
      z
        .number({ error: "Enter the approved amount." })
        .min(1_000, "Approved amount must be at least PHP 1,000.")
        .max(1_000_000, "Approved amount must be PHP 1,000,000 or less."),
    ),
    repaymentAmount: requiredNumber(
      z
        .number({ error: "Enter the repayment amount." })
        .min(1_000, "Repayment amount must be at least PHP 1,000.")
        .max(1_500_000, "Repayment amount must be PHP 1,500,000 or less."),
    ),
    fees: requiredNumber(
      z
        .number({ error: "Enter fees, or 0 if none." })
        .min(0, "Fees cannot be negative.")
        .max(500_000, "Fees must be PHP 500,000 or less."),
    ),
    dueDate: z
      .string()
      .trim()
      .min(1, "Select a due date.")
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)), {
        message: "Select a valid due date.",
      }),
    remarks: z
      .string()
      .trim()
      .max(500, "Keep remarks under 500 characters.")
      .optional()
      .or(z.literal("")),
  })
  .refine((values) => values.repaymentAmount >= values.approvedAmount, {
    path: ["repaymentAmount"],
    message: "Repayment amount must be at least the approved amount.",
  })
  .refine((values) => values.fees <= values.repaymentAmount, {
    path: ["fees"],
    message: "Fees cannot exceed the repayment amount.",
  });

export type LoanOfferInput = z.infer<typeof loanOfferSchema>;

type LoanOfferRow = Database["public"]["Tables"]["loan_offers"]["Row"];
export type LoanOfferStatus = Database["public"]["Enums"]["offer_status"];

export type LoanOfferSummary = {
  id: string;
  applicationId: string;
  lenderName: string;
  approvedAmount: number;
  repaymentAmount: number;
  fees: number;
  dueDate: string;
  remarks: string | null;
  status: LoanOfferStatus;
  sentAt: string;
};

export function mapLoanOfferRow(row: LoanOfferRow): LoanOfferSummary {
  return {
    id: row.id,
    applicationId: row.loan_application_id,
    lenderName: row.lender_name,
    approvedAmount: row.approved_amount,
    repaymentAmount: row.repayment_amount,
    fees: row.fees,
    dueDate: row.due_date,
    remarks: row.remarks,
    status: row.status,
    sentAt: row.sent_at,
  };
}

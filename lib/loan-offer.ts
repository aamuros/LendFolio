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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export const PLATFORM_PROCESSING_FEE_RATE = 0.02;

export function calculatePlatformProcessingFee(approvedPrincipal: number) {
  return roundMoney(approvedPrincipal * PLATFORM_PROCESSING_FEE_RATE);
}

export const loanOfferSchema = z
  .object({
    approvedAmount: requiredNumber(
      z
        .number({ error: "Enter the approved amount." })
        .positive("Approved principal must be greater than PHP 0.")
        .max(1_000_000, "Approved amount must be PHP 1,000,000 or less."),
    ),
    interestServiceChargeRate: requiredNumber(
      z
        .number({ error: "Enter the interest or service charge rate." })
        .min(0, "Interest or service charge rate cannot be negative.")
        .max(100, "Interest or service charge rate must be 100% or less."),
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
      .min(1, "Select a final repayment date.")
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)), {
        message: "Select a valid repayment date.",
      })
      .refine((value) => value > new Date().toISOString().slice(0, 10), {
        message: "Choose a future repayment date.",
      }),
    remarks: z
      .string()
      .trim()
      .max(500, "Keep remarks under 500 characters.")
      .optional()
      .or(z.literal("")),
    repaymentChannel: z
      .string()
      .trim()
      .min(1, "Enter a repayment channel.")
      .max(100, "Keep repayment channel under 100 characters."),
    repaymentAccountName: z
      .string()
      .trim()
      .min(1, "Enter the account name for repayment.")
      .max(200, "Keep account name under 200 characters."),
    repaymentAccountNumber: z
      .string()
      .trim()
      .min(1, "Enter the account number for repayment.")
      .max(100, "Keep account number under 100 characters."),
    repaymentInstructions: z
      .string()
      .trim()
      .max(500, "Keep repayment instructions under 500 characters.")
      .optional()
      .or(z.literal("")),
  })
  .transform((values) => ({
    ...values,
    interestServiceCharge: roundMoney(
      values.approvedAmount * (values.interestServiceChargeRate / 100),
    ),
    processingFee: calculatePlatformProcessingFee(values.approvedAmount),
    processingFeeRate: PLATFORM_PROCESSING_FEE_RATE,
    repaymentAmount:
      values.approvedAmount +
      roundMoney(values.approvedAmount * (values.interestServiceChargeRate / 100)) +
      values.fees,
  }))
  .refine((values) => values.repaymentAmount <= 1_500_000, {
    path: ["interestServiceChargeRate"],
    message: "Total repayment must be PHP 1,500,000 or less.",
  });

export type LoanOfferInput = z.infer<typeof loanOfferSchema>;

type LoanOfferRow = Database["public"]["Tables"]["loan_offers"]["Row"];
export type LoanOfferStatus = Database["public"]["Enums"]["offer_status"];

export type LoanOfferSummary = {
  id: string;
  applicationId: string;
  lenderId: string;
  lenderName: string;
  approvedAmount: number;
  principalAmount: number;
  totalRepaymentAmount: number;
  fees: number;
  processingFee: number;
  processingFeeRate: number;
  interestAmount: number;
  interestServiceChargeRate: number | null;
  dueDate: string;
  remarks: string | null;
  status: LoanOfferStatus;
  sentAt: string;
  repaymentChannel: string | null;
  repaymentAccountName: string | null;
  repaymentAccountNumber: string | null;
  repaymentInstructions: string | null;
};

export function deriveInterestAmount({
  principalAmount,
  repaymentAmount,
  fees,
}: {
  principalAmount: number;
  repaymentAmount: number;
  fees: number;
}) {
  return Math.max(0, repaymentAmount - principalAmount - fees);
}

export function mapLoanOfferRow(row: LoanOfferRow): LoanOfferSummary {
  const processingFee = row.processing_fee_amount ?? 0;
  const interestAmount = deriveInterestAmount({
    principalAmount: row.approved_amount,
    repaymentAmount: row.repayment_amount,
    fees: row.fees,
  });

  return {
    id: row.id,
    applicationId: row.loan_application_id,
    lenderId: row.lender_id,
    lenderName: row.lender_name,
    approvedAmount: row.approved_amount,
    principalAmount: row.approved_amount,
    totalRepaymentAmount: row.repayment_amount,
    fees: row.fees,
    processingFee,
    processingFeeRate: row.processing_fee_rate ?? PLATFORM_PROCESSING_FEE_RATE,
    interestAmount,
    interestServiceChargeRate: row.interest_service_charge_rate,
    dueDate: row.due_date,
    remarks: row.remarks,
    status: row.status,
    sentAt: row.sent_at,
    repaymentChannel: row.repayment_channel,
    repaymentAccountName: row.repayment_account_name,
    repaymentAccountNumber: row.repayment_account_number,
    repaymentInstructions: row.repayment_instructions,
  };
}

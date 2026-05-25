"use server";

import { revalidatePath } from "next/cache";
import {
  createLoanOfferSchema,
  loanOfferSchema,
  type LoanOfferInput,
} from "@/lib/loan-offer";
import type { Json } from "@/lib/supabase/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateLoanOfferState =
  | {
      ok: true;
      message: string;
      fieldErrors?: never;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<keyof LoanOfferInput, string[]>>;
    };

type CreateLoanOfferResult = {
  ok: boolean;
  message?: string;
  offer_id?: string;
  loan_application_id?: string;
};

export async function createLoanOffer(
  applicationId: string,
  _previousState: CreateLoanOfferState,
  formData: FormData,
): Promise<CreateLoanOfferState> {
  const requestedAmount = Number(formData.get("requestedAmount"));
  const schema = Number.isFinite(requestedAmount)
    ? createLoanOfferSchema(requestedAmount)
    : loanOfferSchema;
  const parsed = schema.safeParse({
    approvedAmount: formData.get("approvedAmount"),
    repaymentAmount: formData.get("repaymentAmount"),
    fees: formData.get("fees"),
    dueDate: formData.get("dueDate"),
    remarks: formData.get("remarks"),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      message: "Review the highlighted offer fields before sending.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc("create_loan_offer", {
      p_loan_application_id: applicationId,
      p_approved_amount: parsed.data.approvedAmount,
      p_repayment_amount: parsed.data.repaymentAmount,
      p_fees: parsed.data.fees,
      p_due_date: parsed.data.dueDate,
      p_remarks: parsed.data.remarks || null,
    });

    if (error) {
      return {
        ok: false,
        message: "Could not send offer.",
      };
    }

    const result = data as Json as CreateLoanOfferResult;

    if (!result.ok) {
      return {
        ok: false,
        message: result.message ?? "Could not send offer.",
      };
    }

    revalidatePath(
      `/lender/applications/${result.loan_application_id ?? applicationId}`,
    );
    revalidatePath("/borrower");

    return {
      ok: true,
      message: result.message ?? "Offer sent.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not send offer.",
    };
  }
}

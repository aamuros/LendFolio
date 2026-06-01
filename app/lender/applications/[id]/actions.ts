"use server";

import { revalidatePath } from "next/cache";
import { loanOfferSchema, type LoanOfferInput } from "@/lib/loan-offer";
import type { Json } from "@/lib/supabase/types";
import { requireApprovedLender } from "@/lib/access-control";

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
  const access = await requireApprovedLender();

  if (!access.ok) {
    return {
      ok: false,
      message: access.message,
    };
  }

  const parsed = loanOfferSchema.safeParse({
    approvedAmount: formData.get("approvedAmount"),
    interestServiceCharge: formData.get("interestServiceCharge"),
    fees: formData.get("fees"),
    dueDate: formData.get("dueDate"),
    remarks: formData.get("remarks"),
    repaymentChannel: formData.get("repaymentChannel"),
    repaymentAccountName: formData.get("repaymentAccountName"),
    repaymentAccountNumber: formData.get("repaymentAccountNumber"),
    repaymentInstructions: formData.get("repaymentInstructions"),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      message: "Review the highlighted offer fields before sending.",
      fieldErrors,
    };
  }

  const { data: application, error: applicationError } = await access.supabase
    .from("loan_applications")
    .select("requested_amount")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    return {
      ok: false,
      message: "Could not verify the application details.",
    };
  }

  if (parsed.data.approvedAmount > application.requested_amount) {
    return {
      ok: false,
      message: "Approved amount cannot exceed the borrower's requested amount.",
      fieldErrors: {
        approvedAmount: [
          "Approved amount cannot exceed the borrower's requested amount.",
        ],
      },
    };
  }

  try {
    const { data, error } = await access.supabase.rpc("create_loan_offer", {
      p_loan_application_id: applicationId,
      p_approved_amount: parsed.data.approvedAmount,
      p_repayment_amount: parsed.data.repaymentAmount,
      p_fees: parsed.data.fees,
      p_due_date: parsed.data.dueDate,
      p_remarks: parsed.data.remarks || null,
      p_repayment_channel: parsed.data.repaymentChannel,
      p_repayment_account_name: parsed.data.repaymentAccountName,
      p_repayment_account_number: parsed.data.repaymentAccountNumber,
      p_repayment_instructions: parsed.data.repaymentInstructions || null,
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
    revalidatePath("/lender");
    revalidatePath("/lender/applications");
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

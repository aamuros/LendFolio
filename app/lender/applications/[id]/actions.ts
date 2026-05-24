"use server";

import { revalidatePath } from "next/cache";
import { loanOfferSchema, type LoanOfferInput } from "@/lib/loan-offer";
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

export async function createLoanOffer(
  applicationId: string,
  _previousState: CreateLoanOfferState,
  formData: FormData,
): Promise<CreateLoanOfferState> {
  const parsed = loanOfferSchema.safeParse({
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message:
          "Sign in with the lender demo account before sending an offer.",
      };
    }

    const { data: application, error: applicationError } = await supabase
      .from("loan_applications")
      .select("id, borrower_id, status")
      .eq("id", applicationId)
      .in("status", ["submitted", "open"])
      .maybeSingle();

    if (applicationError || !application) {
      return {
        ok: false,
        message: "This application is not open for lender offer creation.",
      };
    }

    const { error } = await supabase.from("loan_offers").insert({
      loan_application_id: application.id,
      borrower_id: application.borrower_id,
      lender_id: user.id,
      lender_name: getLenderDisplayName(user.email),
      approved_amount: parsed.data.approvedAmount,
      repayment_amount: parsed.data.repaymentAmount,
      fees: parsed.data.fees,
      due_date: parsed.data.dueDate,
      remarks: parsed.data.remarks || null,
      status: "pending",
    });

    if (error) {
      return {
        ok: false,
        message:
          "Supabase rejected the offer. Confirm the loan_offers table and demo RLS policies.",
      };
    }

    revalidatePath(`/lender/applications/${application.id}`);
    revalidatePath("/borrower");

    return {
      ok: true,
      message: "Pending offer sent to the borrower.",
    };
  } catch {
    return {
      ok: false,
      message:
        "Supabase is not configured yet. Offer creation needs the ADI-12 schema and lender demo sign-in.",
    };
  }
}

function getLenderDisplayName(email?: string) {
  if (!email) {
    return "Verified lender";
  }

  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  if (!localPart) {
    return "Verified lender";
  }

  return localPart
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

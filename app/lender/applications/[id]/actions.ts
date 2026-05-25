"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedLender } from "@/lib/access-control";
import { loanOfferSchema, type LoanOfferInput } from "@/lib/loan-offer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { openApplicationStatuses } from "@/lib/workflow-rules";

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
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data: application, error: applicationError } = await supabase
      .from("loan_applications")
      .select("id, borrower_id, status")
      .eq("id", applicationId)
      .in("status", [...openApplicationStatuses])
      .maybeSingle();

    if (applicationError || !application) {
      return {
        ok: false,
        message: "This application is not open for lender offer creation.",
      };
    }

    const { data: acceptedOffer, error: acceptedOfferError } = await supabase
      .from("loan_offers")
      .select("id")
      .eq("loan_application_id", application.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (acceptedOfferError) {
      return {
        ok: false,
        message:
          "Could not confirm current offer status before sending a new offer.",
      };
    }

    if (acceptedOffer) {
      return {
        ok: false,
        message: "This application already has an accepted offer.",
      };
    }

    const { data: existingPendingOffer, error: existingPendingOfferError } =
      await supabase
        .from("loan_offers")
        .select("id")
        .eq("loan_application_id", application.id)
        .eq("lender_id", access.profile.id)
        .eq("status", "pending")
        .maybeSingle();

    if (existingPendingOfferError) {
      return {
        ok: false,
        message:
          "Could not confirm your current offer status before sending a new offer.",
      };
    }

    if (existingPendingOffer) {
      return {
        ok: false,
        message: "You already have a pending offer for this application.",
      };
    }

    const { error } = await supabase.from("loan_offers").insert({
      loan_application_id: application.id,
      borrower_id: application.borrower_id,
      lender_id: access.profile.id,
      lender_name:
        access.profile.lenderProfile?.organization_name ??
        access.profile.display_name,
      approved_amount: parsed.data.approvedAmount,
      repayment_amount: parsed.data.repaymentAmount,
      fees: parsed.data.fees,
      due_date: parsed.data.dueDate,
      remarks: parsed.data.remarks || null,
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          message: "You already have a pending offer for this application.",
        };
      }

      return {
        ok: false,
        message: "Could not send offer.",
      };
    }

    revalidatePath(`/lender/applications/${application.id}`);
    revalidatePath("/borrower");

    return {
      ok: true,
      message: "Offer sent.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not send offer.",
    };
  }
}

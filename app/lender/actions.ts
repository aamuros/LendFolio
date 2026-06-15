"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedLender } from "@/lib/access-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  uploadLenderVerificationDocument,
  type LenderVerificationDocumentSubmitResult,
} from "@/lib/lender-verification-upload";

export type RepaymentProofReviewResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export async function verifyRepaymentProof(
  proofId: string,
): Promise<RepaymentProofReviewResult> {
  return reviewRepaymentProof(proofId, "verified");
}

export async function rejectRepaymentProof(
  proofId: string,
  reviewNotes: string,
): Promise<RepaymentProofReviewResult> {
  return reviewRepaymentProof(proofId, "rejected", reviewNotes);
}

async function reviewRepaymentProof(
  proofId: string,
  decision: "verified" | "rejected",
  reviewNotes = "",
): Promise<RepaymentProofReviewResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("review_repayment_proof", {
      p_proof_id: proofId,
      p_decision: decision,
      p_review_notes: reviewNotes,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
        }
      | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message:
          result?.message ??
          (decision === "verified"
            ? "Could not verify repayment."
            : "Could not reject proof."),
      };
    }

    revalidatePath("/borrower");
    revalidatePath("/lender");
    revalidatePath("/lender/applications");

    return {
      ok: true,
      message:
        result.message ??
        (decision === "verified" ? "Repayment verified." : "Proof rejected."),
    };
  } catch {
    return {
      ok: false,
      message:
        decision === "verified"
          ? "Could not verify repayment."
          : "Could not reject proof.",
    };
  }
}

export async function submitLenderVerificationDocument(
  _previousState: LenderVerificationDocumentSubmitResult | null,
  formData: FormData,
): Promise<LenderVerificationDocumentSubmitResult> {
  return uploadLenderVerificationDocument(formData);
}

export type LenderProfileChangeRequestSubmitResult =
  | {
      ok: true;
      message: string;
      requestId: string;
    }
  | {
      ok: false;
      message: string;
    };

export async function submitLenderProfileChangeRequest(
  formData: FormData,
): Promise<LenderProfileChangeRequestSubmitResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return { ok: false, message: access.message };
    }

    const lenderProfileId = access.profile.lenderProfile?.id;
    if (!lenderProfileId) {
      return { ok: false, message: "Lender profile was not found." };
    }

    const { data, error } = await supabase.rpc(
      "submit_lender_profile_change_request",
      {
        p_lender_profile_id: lenderProfileId,
        p_proposed_organization_name:
          String(formData.get("organizationName") ?? "") || null,
        p_proposed_contact_person:
          String(formData.get("contactPerson") ?? "") || null,
        p_proposed_business_address:
          String(formData.get("businessAddress") ?? "") || null,
        p_proposed_operating_area:
          String(formData.get("operatingArea") ?? "") || null,
        p_proposed_business_registration_number:
          String(formData.get("businessRegistrationNumber") ?? "") || null,
        p_proposed_min_loan_amount: formData.get("minLoanAmount")
          ? Number(formData.get("minLoanAmount"))
          : null,
        p_proposed_max_loan_amount: formData.get("maxLoanAmount")
          ? Number(formData.get("maxLoanAmount"))
          : null,
        p_proposed_typical_repayment_terms:
          String(formData.get("typicalRepaymentTerms") ?? "") || null,
        p_proposed_lender_description:
          String(formData.get("lenderDescription") ?? "") || null,
        p_proposed_address_region:
          String(formData.get("addressRegionCode") ?? "") || null,
        p_proposed_address_city:
          String(formData.get("addressCity") ?? "") || null,
        p_proposed_address_barangay:
          String(formData.get("addressBarangay") ?? "") || null,
        p_proposed_address_zip_code:
          String(formData.get("addressZipCode") ?? "") || null,
      },
    );

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          request_id?: string;
        }
      | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message: result?.message ?? "Could not submit change request.",
      };
    }

    revalidatePath("/lender");

    return {
      ok: true,
      message: result.message ?? "Profile change request submitted.",
      requestId: result.request_id ?? "",
    };
  } catch {
    return { ok: false, message: "Could not submit change request." };
  }
}

export async function cancelLenderProfileChangeRequest(
  requestId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return { ok: false, message: access.message };
    }

    const { data, error } = await supabase.rpc(
      "cancel_lender_profile_change_request",
      { p_request_id: requestId },
    );

    const result = data as { ok?: boolean; message?: string } | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message: result?.message ?? "Could not cancel change request.",
      };
    }

    revalidatePath("/lender");

    return { ok: true, message: result.message ?? "Change request cancelled." };
  } catch {
    return { ok: false, message: "Could not cancel change request." };
  }
}

export type RepaymentChannelResult =
  | { ok: true; message: string; channelId?: string }
  | { ok: false; message: string };

export async function addRepaymentChannel(
  activeLoanId: string,
  channel: string,
  accountName: string,
  accountNumber: string,
  instructions: string,
): Promise<RepaymentChannelResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return { ok: false, message: access.message };
    }

    const { data, error } = await supabase.rpc("add_repayment_channel", {
      p_active_loan_id: activeLoanId,
      p_channel: channel,
      p_account_name: accountName,
      p_account_number: accountNumber,
      p_instructions: instructions || null,
    });

    const result = data as
      | { ok?: boolean; message?: string; channel_id?: string }
      | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message: result?.message ?? "Could not add repayment channel.",
      };
    }

    revalidatePath("/lender");
    revalidatePath("/borrower");

    return {
      ok: true,
      message: result.message ?? "Repayment channel added.",
      channelId: result.channel_id,
    };
  } catch {
    return { ok: false, message: "Could not add repayment channel." };
  }
}

export async function removeRepaymentChannel(
  channelId: string,
): Promise<RepaymentChannelResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return { ok: false, message: access.message };
    }

    const { data, error } = await supabase.rpc("remove_repayment_channel", {
      p_channel_id: channelId,
    });

    const result = data as { ok?: boolean; message?: string } | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message: result?.message ?? "Could not remove repayment channel.",
      };
    }

    revalidatePath("/lender");
    revalidatePath("/borrower");

    return {
      ok: true,
      message: result.message ?? "Repayment channel removed.",
    };
  } catch {
    return { ok: false, message: "Could not remove repayment channel." };
  }
}

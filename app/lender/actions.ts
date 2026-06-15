"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedLender } from "@/lib/access-control";
import {
  lenderProfileDetailsSchema,
  resolveLenderOnboardingAddress,
} from "@/lib/lender-onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  uploadLenderVerificationDocument,
  type LenderVerificationDocumentSubmitResult,
} from "@/lib/lender-verification-upload";

const lenderDetailsSchema = lenderProfileDetailsSchema;

export type LenderDetailsSaveState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<
    Record<
      | "contactPerson"
      | "phoneNumber"
      | "streetAddress"
      | "addressRegion"
      | "addressCity"
      | "addressBarangay"
      | "addressZipCode"
      | "businessRegistrationNumber"
      | "operatingArea"
      | "minLoanAmount"
      | "maxLoanAmount"
      | "organizationName"
      | "typicalRepaymentTerms"
      | "lenderDescription",
      string[]
    >
  >;
  values?: Record<string, string>;
};

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

export async function saveLenderDetailsAction(
  _previousState: LenderDetailsSaveState,
  formData: FormData,
): Promise<LenderDetailsSaveState> {
  const addressSelection = {
    regionCode: String(formData.get("addressRegionCode") ?? ""),
    regionName: String(formData.get("addressRegionName") ?? ""),
    cityOrMunicipality: String(formData.get("addressCity") ?? ""),
    barangay: String(formData.get("addressBarangay") ?? ""),
    zipCode: String(formData.get("addressZipCode") ?? ""),
  };
  const streetAddress = String(formData.get("streetAddress") ?? "");
  const parsed = lenderDetailsSchema.safeParse({
    organizationName: formData.get("organizationName"),
    contactPerson: formData.get("contactPerson"),
    phoneNumber: formData.get("phoneNumber"),
    streetAddress,
    address: addressSelection,
    businessRegistrationNumber: formData.get("businessRegistrationNumber"),
    minLoanAmount: formData.get("minLoanAmount"),
    maxLoanAmount: formData.get("maxLoanAmount"),
    typicalRepaymentTerms: formData.get("typicalRepaymentTerms"),
    lenderDescription: formData.get("lenderDescription"),
  });

  if (!parsed.success) {
    const fieldErrors = getLenderDetailsValidationFieldErrors(parsed.error.issues);
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
      values: readLenderDetailsFormValues(formData),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const resolvedAddress = resolveLenderOnboardingAddress(
      parsed.data.address,
      parsed.data.streetAddress || undefined,
    );
    const lenderDetailsPayload = {
      p_organization_name: parsed.data.organizationName,
      p_contact_person: parsed.data.contactPerson.trim(),
      p_phone_number: parsed.data.phoneNumber,
      p_business_address: resolvedAddress.businessAddress,
      p_operating_area: resolvedAddress.operatingArea,
      p_business_registration_number:
        parsed.data.businessRegistrationNumber || null,
      p_min_loan_amount: parsed.data.minLoanAmount,
      p_max_loan_amount: parsed.data.maxLoanAmount,
      p_typical_repayment_terms: parsed.data.typicalRepaymentTerms,
      p_lender_description: parsed.data.lenderDescription?.trim() || null,
      p_address_region: resolvedAddress.addressRegion,
      p_address_city: resolvedAddress.addressCity,
      p_address_barangay: resolvedAddress.addressBarangay,
      p_address_zip_code: resolvedAddress.addressZipCode,
    };
    let { data, error } = await supabase.rpc(
      "complete_lender_profile_details",
      lenderDetailsPayload,
    );

    if (error && isStaleLenderDetailsRpcError(error.message)) {
      console.error(
        "complete_lender_profile_details RPC is missing the extended signature; falling back to submit_lender_onboarding.",
        error.message,
      );

      const fallback = await supabase.rpc(
        "submit_lender_onboarding",
        lenderDetailsPayload,
      );

      data = fallback.data;
      error = fallback.error;
    }

    const result = data as { ok?: boolean; message?: string } | null;

    if (error || !result?.ok) {
      const message =
        result?.message ??
        formatLenderDetailsSaveError(error?.message) ??
        "We could not save your lender details. Please try again.";

      if (error) {
        console.error("Could not save lender details.", error.message);
      }

      return {
        status: "error",
        message,
        fieldErrors: mapLenderDetailsSaveMessageToFieldErrors(message),
        values: readLenderDetailsFormValues(formData),
      };
    }

    revalidatePath("/lender");
    revalidatePath("/manager/lenders");

    return {
      status: "success",
      message: result.message ?? "Lender details submitted.",
    };
  } catch (error) {
    console.error("Unexpected lender details save failure.", error);

    return {
      status: "error",
      message: "We could not save your lender details. Please try again.",
      values: readLenderDetailsFormValues(formData),
    };
  }
}

function readLenderDetailsFormValues(formData: FormData) {
  return {
    organizationName: String(formData.get("organizationName") ?? ""),
    contactPerson: String(formData.get("contactPerson") ?? ""),
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
    streetAddress: String(formData.get("streetAddress") ?? ""),
    businessRegistrationNumber: String(
      formData.get("businessRegistrationNumber") ?? "",
    ),
    minLoanAmount: String(formData.get("minLoanAmount") ?? ""),
    maxLoanAmount: String(formData.get("maxLoanAmount") ?? ""),
    typicalRepaymentTerms: String(formData.get("typicalRepaymentTerms") ?? ""),
    lenderDescription: String(formData.get("lenderDescription") ?? ""),
  };
}

function getLenderDetailsValidationFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): LenderDetailsSaveState["fieldErrors"] {
  const fieldErrors: LenderDetailsSaveState["fieldErrors"] = {};
  const fieldMap: Record<string, keyof NonNullable<LenderDetailsSaveState["fieldErrors"]>> = {
    organizationName: "organizationName",
    contactPerson: "contactPerson",
    phoneNumber: "phoneNumber",
    streetAddress: "streetAddress",
    "address.regionCode": "addressRegion",
    "address.regionName": "addressRegion",
    "address.cityOrMunicipality": "addressCity",
    "address.barangay": "addressBarangay",
    "address.zipCode": "addressZipCode",
    address: "addressRegion",
    businessRegistrationNumber: "businessRegistrationNumber",
    minLoanAmount: "minLoanAmount",
    maxLoanAmount: "maxLoanAmount",
    typicalRepaymentTerms: "typicalRepaymentTerms",
    lenderDescription: "lenderDescription",
  };

  for (const issue of issues) {
    const field = fieldMap[issue.path.join(".")];

    if (!field) {
      continue;
    }

    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return fieldErrors;
}

function isStaleLenderDetailsRpcError(message?: string) {
  if (!message) {
    return false;
  }

  return (
    message.includes("Could not find the function") ||
    message.includes("complete_lender_profile_details") ||
    message.includes("PGRST202")
  );
}

function formatLenderDetailsSaveError(message?: string) {
  if (!message) {
    return null;
  }

  if (isStaleLenderDetailsRpcError(message)) {
    return "We could not save your lender details because the lender profile update is not available. Run the latest database migrations and try again.";
  }

  if (message.includes("JWT") || message.includes("Auth session missing")) {
    return "Sign in again before saving lender details.";
  }

  return message;
}

function mapLenderDetailsSaveMessageToFieldErrors(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("organization")) {
    return { organizationName: [message] };
  }

  if (normalized.includes("contact person")) {
    return { contactPerson: [message] };
  }

  if (normalized.includes("phone")) {
    return { phoneNumber: [message] };
  }

  if (normalized.includes("address")) {
    return { addressRegion: [message] };
  }

  if (normalized.includes("area")) {
    return { addressRegion: [message] };
  }

  if (normalized.includes("registration")) {
    return { businessRegistrationNumber: [message] };
  }

  if (normalized.includes("loan amount") || normalized.includes("loan range")) {
    return { maxLoanAmount: [message] };
  }

  if (normalized.includes("repayment")) {
    return { typicalRepaymentTerms: [message] };
  }

  if (normalized.includes("description")) {
    return { lenderDescription: [message] };
  }

  return undefined;
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

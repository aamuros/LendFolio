"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { lenderOnboardingSchema } from "@/lib/lender-onboarding";
import {
  getConsentRequestMetadata,
} from "@/lib/consent-recording";
import {
  getRequiredConsentVersions,
  toConsentRpcPayload,
} from "@/lib/consents";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

type LenderOnboardingFieldErrors = Partial<
  Record<
    | "organizationName"
    | "contactPerson"
    | "phoneNumber"
    | "businessAddress"
    | "operatingArea"
    | "businessRegistrationNumber"
    | "minLoanAmount"
    | "maxLoanAmount"
    | "typicalRepaymentTerms"
    | "lenderDescription"
    | "lenderReviewConsentAccepted",
    string[]
  >
>;

export type LenderOnboardingState = {
  message: string;
  status: "idle" | "error" | "success";
  fieldErrors?: LenderOnboardingFieldErrors;
};

export async function lenderOnboardingAction(
  _previousState: LenderOnboardingState,
  formData: FormData,
): Promise<LenderOnboardingState> {
  const parsed = lenderOnboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
    contactPerson: formData.get("contactPerson"),
    phoneNumber: formData.get("phoneNumber"),
    businessAddress: formData.get("businessAddress"),
    operatingArea: formData.get("operatingArea"),
    businessRegistrationNumber: formData.get("businessRegistrationNumber"),
    minLoanAmount: formData.get("minLoanAmount"),
    maxLoanAmount: formData.get("maxLoanAmount"),
    typicalRepaymentTerms: formData.get("typicalRepaymentTerms"),
    lenderDescription: formData.get("lenderDescription"),
    lenderReviewConsentAccepted: formData.get("lenderReviewConsentAccepted"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as LenderOnboardingFieldErrors,
    };
  }

  const input = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc("submit_lender_onboarding", {
      p_organization_name: input.organizationName,
      p_contact_person: input.contactPerson,
      p_phone_number: input.phoneNumber,
      p_business_address: input.businessAddress,
      p_operating_area: input.operatingArea,
      p_business_registration_number:
        input.businessRegistrationNumber || null,
      p_min_loan_amount: input.minLoanAmount,
      p_max_loan_amount: input.maxLoanAmount,
      p_typical_repayment_terms: input.typicalRepaymentTerms,
      p_lender_description: input.lenderDescription,
    });

    const result = data as Json as {
      ok?: boolean;
      message?: string;
    } | null;

    if (error || !result?.ok) {
      return {
        status: "error",
        message:
          result?.message ?? "Could not submit your lender profile. Try again.",
      };
    }

    const requiredConsents = getRequiredConsentVersions("lender_review");
    const requestHeaders = await headers();
    const { ipAddress, userAgent } = getConsentRequestMetadata(requestHeaders);

    const { error: consentError } = await supabase.rpc("accept_user_consents", {
      p_consents: toConsentRpcPayload(requiredConsents) as Json,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (consentError) {
      return {
        status: "error",
        message:
          "Your lender profile was submitted, but we could not record your disclosure acceptance. Please contact support.",
      };
    }
  } catch {
    return {
      status: "error",
      message: "Lender onboarding is temporarily unavailable.",
    };
  }

  redirect("/lender");
}

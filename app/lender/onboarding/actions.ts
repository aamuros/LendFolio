"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  lenderOnboardingSchema,
  resolveLenderOnboardingAddress,
} from "@/lib/lender-onboarding";
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
    | "streetAddress"
    | "addressRegion"
    | "addressCity"
    | "addressBarangay"
    | "addressZipCode"
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
  values?: {
    organizationName?: string;
    contactPerson?: string;
    phoneNumber?: string;
    streetAddress?: string;
    businessRegistrationNumber?: string;
    minLoanAmount?: string;
    maxLoanAmount?: string;
    typicalRepaymentTerms?: string;
    lenderDescription?: string;
    lenderReviewConsentAccepted?: boolean;
  };
};

function extractFieldErrors(
  flattened: Record<string, string[] | undefined>,
): LenderOnboardingFieldErrors {
  const errors: LenderOnboardingFieldErrors = {};

  for (const [key, messages] of Object.entries(flattened)) {
    if (key === "address") {
      if (flattened["address.regionCode"]) {
        errors.addressRegion = flattened["address.regionCode"];
      }
      if (flattened["address.cityOrMunicipality"]) {
        errors.addressCity = flattened["address.cityOrMunicipality"];
      }
      if (flattened["address.barangay"]) {
        errors.addressBarangay = flattened["address.barangay"];
      }
      if (flattened["address.zipCode"]) {
        errors.addressZipCode = flattened["address.zipCode"];
      }
    } else if (
      [
        "organizationName",
        "contactPerson",
        "phoneNumber",
        "streetAddress",
        "businessRegistrationNumber",
        "minLoanAmount",
        "maxLoanAmount",
        "typicalRepaymentTerms",
        "lenderDescription",
        "lenderReviewConsentAccepted",
      ].includes(key)
    ) {
      (errors as Record<string, string[]>)[key] = messages as string[];
    }
  }

  if (
    flattened["address.regionCode"] &&
    !errors.addressRegion
  ) {
    errors.addressRegion = flattened["address.regionCode"];
  }
  if (
    flattened["address.cityOrMunicipality"] &&
    !errors.addressCity
  ) {
    errors.addressCity = flattened["address.cityOrMunicipality"];
  }
  if (
    flattened["address.barangay"] &&
    !errors.addressBarangay
  ) {
    errors.addressBarangay = flattened["address.barangay"];
  }
  if (
    flattened["address.zipCode"] &&
    !errors.addressZipCode
  ) {
    errors.addressZipCode = flattened["address.zipCode"];
  }

  return errors;
}

export async function lenderOnboardingAction(
  _previousState: LenderOnboardingState,
  formData: FormData,
): Promise<LenderOnboardingState> {
  const addressSelection = {
    regionCode: String(formData.get("addressRegionCode") ?? ""),
    regionName: String(formData.get("addressRegionName") ?? ""),
    cityOrMunicipality: String(formData.get("addressCity") ?? ""),
    barangay: String(formData.get("addressBarangay") ?? ""),
    zipCode: String(formData.get("addressZipCode") ?? ""),
  };

  const streetAddress = String(formData.get("streetAddress") ?? "");

  const parsed = lenderOnboardingSchema.safeParse({
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
    lenderReviewConsentAccepted: formData.get("lenderReviewConsentAccepted"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: extractFieldErrors(flattened as Record<string, string[] | undefined>),
      values: {
        organizationName: String(formData.get("organizationName") ?? ""),
        contactPerson: String(formData.get("contactPerson") ?? ""),
        phoneNumber: String(formData.get("phoneNumber") ?? ""),
        streetAddress,
        businessRegistrationNumber: String(formData.get("businessRegistrationNumber") ?? ""),
        minLoanAmount: String(formData.get("minLoanAmount") ?? ""),
        maxLoanAmount: String(formData.get("maxLoanAmount") ?? ""),
        typicalRepaymentTerms: String(formData.get("typicalRepaymentTerms") ?? ""),
        lenderDescription: String(formData.get("lenderDescription") ?? ""),
        lenderReviewConsentAccepted: formData.get("lenderReviewConsentAccepted") === "on",
      },
    };
  }

  const input = parsed.data;
  const resolvedAddress = resolveLenderOnboardingAddress(
    input.address,
    input.streetAddress || undefined,
  );

  try {
    const supabase = await createSupabaseServerClient();

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
          "We could not record your disclosure acceptance. Please try again.",
        values: {
          organizationName: input.organizationName,
          contactPerson: input.contactPerson,
          phoneNumber: input.phoneNumber,
          streetAddress: input.streetAddress ?? "",
          businessRegistrationNumber: input.businessRegistrationNumber ?? "",
          minLoanAmount: String(input.minLoanAmount),
          maxLoanAmount: String(input.maxLoanAmount),
          typicalRepaymentTerms: input.typicalRepaymentTerms,
          lenderDescription: input.lenderDescription ?? "",
          lenderReviewConsentAccepted: true,
        },
      };
    }

    const { data, error } = await supabase.rpc("submit_lender_onboarding", {
      p_organization_name: input.organizationName,
      p_contact_person: input.contactPerson,
      p_phone_number: input.phoneNumber,
      p_business_address: resolvedAddress.businessAddress,
      p_operating_area: resolvedAddress.operatingArea,
      p_business_registration_number:
        input.businessRegistrationNumber || null,
      p_min_loan_amount: input.minLoanAmount,
      p_max_loan_amount: input.maxLoanAmount,
      p_typical_repayment_terms: input.typicalRepaymentTerms,
      p_lender_description: input.lenderDescription?.trim() || null,
      p_address_region: resolvedAddress.addressRegion,
      p_address_city: resolvedAddress.addressCity,
      p_address_barangay: resolvedAddress.addressBarangay,
      p_address_zip_code: resolvedAddress.addressZipCode,
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
        values: {
          organizationName: input.organizationName,
          contactPerson: input.contactPerson,
          phoneNumber: input.phoneNumber,
          streetAddress: input.streetAddress ?? "",
          businessRegistrationNumber: input.businessRegistrationNumber ?? "",
          minLoanAmount: String(input.minLoanAmount),
          maxLoanAmount: String(input.maxLoanAmount),
          typicalRepaymentTerms: input.typicalRepaymentTerms,
          lenderDescription: input.lenderDescription ?? "",
          lenderReviewConsentAccepted: true,
        },
      };
    }
  } catch {
    return {
      status: "error",
      message: "Lender onboarding is temporarily unavailable.",
      values: {
        organizationName: String(formData.get("organizationName") ?? ""),
        contactPerson: String(formData.get("contactPerson") ?? ""),
        phoneNumber: String(formData.get("phoneNumber") ?? ""),
        streetAddress,
        businessRegistrationNumber: String(formData.get("businessRegistrationNumber") ?? ""),
        minLoanAmount: String(formData.get("minLoanAmount") ?? ""),
        maxLoanAmount: String(formData.get("maxLoanAmount") ?? ""),
        typicalRepaymentTerms: String(formData.get("typicalRepaymentTerms") ?? ""),
        lenderDescription: String(formData.get("lenderDescription") ?? ""),
        lenderReviewConsentAccepted: formData.get("lenderReviewConsentAccepted") === "on",
      },
    };
  }

  redirect("/lender", RedirectType.replace);
}

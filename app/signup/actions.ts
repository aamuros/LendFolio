"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { acceptBaselineUserConsents } from "@/lib/consent-recording";
import { signupSchema } from "@/lib/signup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignupFieldErrors = Partial<
  Record<
    | "role"
    | "displayName"
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
    | "email"
    | "password"
    | "confirmPassword"
    | "termsAccepted"
    | "privacyAccepted",
    string[]
  >
>;

export type SignupState = {
  message: string;
  status: "idle" | "error" | "success";
  fieldErrors?: SignupFieldErrors;
};

export async function signupAction(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    role: formData.get("role"),
    displayName: formData.get("displayName"),
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
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    termsAccepted: formData.get("termsAccepted"),
    privacyAccepted: formData.get("privacyAccepted"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const destination =
    input.role === "borrower" ? "/borrower?message=account-created" : "/?auth=lender-pending";
  let redirectTo: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${origin}${destination}`,
        data: {
          lendfolio_role: input.role,
          display_name: input.displayName,
          organization_name:
            input.role === "lender" ? input.organizationName : undefined,
          contact_person: input.role === "lender" ? input.contactPerson : undefined,
          phone_number: input.role === "lender" ? input.phoneNumber : undefined,
          business_address:
            input.role === "lender" ? input.businessAddress : undefined,
          operating_area:
            input.role === "lender" ? input.operatingArea : undefined,
          business_registration_number:
            input.role === "lender"
              ? input.businessRegistrationNumber
              : undefined,
          min_loan_amount:
            input.role === "lender" ? input.minLoanAmount : undefined,
          max_loan_amount:
            input.role === "lender" ? input.maxLoanAmount : undefined,
          typical_repayment_terms:
            input.role === "lender" ? input.typicalRepaymentTerms : undefined,
          lender_description:
            input.role === "lender" ? input.lenderDescription : undefined,
        },
      },
    });

    if (error || !data.user) {
      return {
        status: "error",
        message: "Could not create the account. Try another email or password.",
      };
    }

    if (!data.session) {
      return {
        status: "success",
        message:
          "Check your email to confirm your account, then sign in to continue.",
      };
    }

    const acceptedBaseline = await acceptBaselineUserConsents(
      supabase,
      requestHeaders,
    );

    if (!acceptedBaseline) {
      return {
        status: "success",
        message:
          "Account created. Sign in to finish setting up your workspace.",
      };
    }

    redirectTo = destination;
  } catch {
    return {
      status: "error",
      message: "Account signup is temporarily unavailable.",
    };
  }

  redirect(redirectTo);
}

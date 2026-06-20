"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  classifySignupError,
  getSignupFailureMessage,
  getSafeSignupErrorMessage,
  logSignupFailure,
  type SignupErrorCode,
} from "@/lib/auth-signup-errors";
import {
  hasConfirmedEmail,
  isSignupConfirmationDeliveryError,
  isSignupConfirmationPendingError,
  SIGNUP_CHECK_EMAIL_MESSAGE,
  SIGNUP_CONFIRMATION_PENDING_MESSAGE,
} from "@/lib/auth-confirmation";
import {
  acceptBaselineUserConsents,
  getSignupConsentMetadata,
} from "@/lib/consent-recording";
import { lenderRegisterSchema } from "@/lib/lender-register";
import { getAuthRedirectUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LenderRegisterFieldErrors = Partial<
  Record<
    | "displayName"
    | "email"
    | "organizationName"
    | "password"
    | "confirmPassword"
    | "termsAccepted"
    | "privacyAccepted",
    string[]
  >
>;

export type LenderRegisterState = {
  message: string;
  status: "idle" | "error" | "success";
  fieldErrors?: LenderRegisterFieldErrors;
  values?: {
    displayName?: string;
    email?: string;
    organizationName?: string;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
  };
  confirmationEmail?: string;
  canResendConfirmation?: boolean;
  errorCode?: SignupErrorCode;
};

export async function lenderRegisterAction(
  _previousState: LenderRegisterState,
  formData: FormData,
): Promise<LenderRegisterState> {
  const parsed = lenderRegisterSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    organizationName: formData.get("organizationName"),
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
      values: {
        displayName: String(formData.get("displayName") ?? ""),
        email: String(formData.get("email") ?? ""),
        organizationName: String(formData.get("organizationName") ?? ""),
        termsAccepted: formData.get("termsAccepted") === "on",
        privacyAccepted: formData.get("privacyAccepted") === "on",
      },
    };
  }

  const input = parsed.data;
  const destination = "/lender/onboarding";
  const emailConfirmationRedirect = "/login?message=email-confirmed";
  let redirectTo: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const requestHeaders = await headers();
    const emailRedirectTo = getAuthRedirectUrl(
      emailConfirmationRedirect,
      requestHeaders,
    );
    const signupConsentMetadata = getSignupConsentMetadata(requestHeaders);

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo,
        data: {
          lendfolio_role: "lender",
          display_name: input.displayName,
          organization_name: input.organizationName,
          ...signupConsentMetadata,
        },
      },
    });

    if (error) {
      if (isSignupConfirmationDeliveryError(error)) {
        if (data.session) {
          await supabase.auth.signOut();
        }

        return {
          status: "error",
          message: getSafeSignupErrorMessage("SIGNUP_CONFIRMATION_SEND_FAILED"),
          errorCode: "SIGNUP_CONFIRMATION_SEND_FAILED",
          canResendConfirmation: true,
          confirmationEmail: input.email,
          values: {
            displayName: input.displayName,
            email: input.email,
            organizationName: input.organizationName,
            termsAccepted: true,
            privacyAccepted: true,
          },
        };
      }

      if (data.user && !hasConfirmedEmail(data.user)) {
        if (data.session) {
          await supabase.auth.signOut();
        }

        return {
          status: "success",
          message: SIGNUP_CHECK_EMAIL_MESSAGE,
          confirmationEmail: input.email,
        };
      }

      if (isSignupConfirmationPendingError(error)) {
        return {
          status: "success",
          message: SIGNUP_CONFIRMATION_PENDING_MESSAGE,
          confirmationEmail: input.email,
        };
      }

      logSignupFailure({ flow: "lender_register", role: "lender" }, error);

      return {
        status: "error",
        message: getSignupFailureMessage(error),
        values: {
          displayName: input.displayName,
          email: input.email,
          organizationName: input.organizationName,
          termsAccepted: true,
          privacyAccepted: true,
        },
      };
    }

    if (!data.user) {
      if (!data.session) {
        return {
          status: "success",
          message: SIGNUP_CHECK_EMAIL_MESSAGE,
          confirmationEmail: input.email,
        };
      }

      logSignupFailure({ flow: "lender_register", role: "lender" }, null);

      return {
        status: "error",
        message: getSignupFailureMessage(null),
        values: {
          displayName: input.displayName,
          email: input.email,
          organizationName: input.organizationName,
          termsAccepted: true,
          privacyAccepted: true,
        },
      };
    }

    if (!data.session || !hasConfirmedEmail(data.user)) {
      if (data.session) {
        await supabase.auth.signOut();
      }

      return {
        status: "success",
        message: SIGNUP_CHECK_EMAIL_MESSAGE,
        confirmationEmail: input.email,
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
  } catch (error) {
    const errorCode = classifySignupError(error);

    return {
      status: "error",
      message: getSafeSignupErrorMessage(errorCode),
      errorCode,
      values: {
        displayName: String(formData.get("displayName") ?? ""),
        email: String(formData.get("email") ?? ""),
        organizationName: String(formData.get("organizationName") ?? ""),
        termsAccepted: formData.get("termsAccepted") === "on",
        privacyAccepted: formData.get("privacyAccepted") === "on",
      },
    };
  }

  redirect(redirectTo, RedirectType.replace);
}

"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  classifySignupError,
  getSafeSignupErrorMessage,
  getSignupRetryDelayMs,
  logSignupDiagnosticFailure,
  type SignupErrorCode,
} from "@/lib/auth-signup-errors";
import {
  hasConfirmedEmail,
  isObfuscatedDuplicateSignupUser,
  isSignupConfirmationDeliveryError,
  isSignupConfirmationPendingError,
  SIGNUP_CHECK_EMAIL_MESSAGE,
} from "@/lib/auth-confirmation";
import {
  acceptBaselineUserConsents,
  getSignupConsentMetadata,
} from "@/lib/consent-recording";
import { lenderRegisterSchema } from "@/lib/lender-register";
import { signupEmailExists } from "@/lib/signup-email";
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
  errorCode?: SignupErrorCode;
  rateLimitCooldownEndsAt?: number;
  canResendConfirmation?: boolean;
  confirmationEmail?: string;
  values?: {
    displayName?: string;
    email?: string;
    organizationName?: string;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
  };
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

    if (await signupEmailExists(supabase, input.email)) {
      return getDuplicateLenderSignupState(input);
    }

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

    if (isObfuscatedDuplicateSignupUser(data.user)) {
      if (data.session) {
        await supabase.auth.signOut();
      }

      return getDuplicateLenderSignupState(input);
    }

    if (error) {
      const errorCode = classifySignupError(error);
      logSignupDiagnosticFailure(error, errorCode, {
        flow: "lender_register",
        role: "lender",
        source: "signUp",
      });

      if (errorCode === "SIGNUP_RATE_LIMITED") {
        return {
          status: "error",
          message: getSafeSignupErrorMessage(errorCode),
          errorCode,
          rateLimitCooldownEndsAt: Date.now() + getSignupRetryDelayMs(error),
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
          canResendConfirmation: true,
          confirmationEmail: input.email,
        };
      }

      if (isSignupConfirmationPendingError(error)) {
        return getDuplicateLenderSignupState(input);
      }

      return {
        status: "error",
        message: getSafeSignupErrorMessage(errorCode),
        errorCode,
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
          canResendConfirmation: true,
          confirmationEmail: input.email,
        };
      }

      logSignupDiagnosticFailure(
        new Error("Signup returned session but no user"),
        "SIGNUP_UNEXPECTED",
        {
          flow: "lender_register",
          role: "lender",
          source: "signUp",
        },
      );

      return {
        status: "error",
        message: getSafeSignupErrorMessage("SIGNUP_UNEXPECTED"),
        errorCode: "SIGNUP_UNEXPECTED",
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
    logSignupDiagnosticFailure(error, errorCode, {
      flow: "lender_register",
      role: "lender",
      source: "signUp",
    });

    return {
      status: "error",
      message: getSafeSignupErrorMessage(errorCode),
      errorCode,
      rateLimitCooldownEndsAt:
        errorCode === "SIGNUP_RATE_LIMITED"
          ? Date.now() + getSignupRetryDelayMs(error)
          : undefined,
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

function getDuplicateLenderSignupState(input: {
  displayName: string;
  email: string;
  organizationName: string;
}): LenderRegisterState {
  return {
    status: "error",
    message: getSafeSignupErrorMessage("SIGNUP_EMAIL_REGISTERED"),
    errorCode: "SIGNUP_EMAIL_REGISTERED",
    values: {
      displayName: input.displayName,
      email: input.email,
      organizationName: input.organizationName,
      termsAccepted: true,
      privacyAccepted: true,
    },
  };
}

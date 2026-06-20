"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  classifySignupError,
  getSafeSignupErrorMessage,
  getSignupRetryDelayMs,
  logSignupFailure,
  logSignupDiagnosticFailure,
  type SignupErrorCode,
} from "@/lib/auth-signup-errors";
import {
  hasConfirmedEmail,
  isSignupConfirmationDeliveryError,
  isSignupConfirmationPendingError,
  SIGNUP_CHECK_EMAIL_MESSAGE,
  SIGNUP_CONFIRMATION_PENDING_MESSAGE,
  SIGNUP_CONFIRMATION_RESEND_SUCCESS_MESSAGE,
} from "@/lib/auth-confirmation";
import {
  acceptBaselineUserConsents,
  getSignupConsentMetadata,
} from "@/lib/consent-recording";
import { getAuthRedirectUrl } from "@/lib/site-url";
import { signupSchema } from "@/lib/signup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignupFieldErrors = Partial<
  Record<
    | "role"
    | "displayName"
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
  errorCode?: SignupErrorCode;
  rateLimitCooldownEndsAt?: number;
  canResendConfirmation?: boolean;
  confirmationEmail?: string;
  values?: {
    displayName?: string;
    email?: string;
    role?: string;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
  };
};

export type ResendSignupConfirmationState = {
  message: string;
  status: "idle" | "error" | "success";
  errorCode?: SignupErrorCode;
  rateLimitCooldownEndsAt?: number;
  confirmationEmail?: string;
};

export async function signupAction(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    role: formData.get("role"),
    displayName: formData.get("displayName"),
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
      values: {
        displayName: String(formData.get("displayName") ?? ""),
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? ""),
        termsAccepted: formData.get("termsAccepted") === "on",
        privacyAccepted: formData.get("privacyAccepted") === "on",
      },
    };
  }

  const input = parsed.data;
  const destination =
    input.role === "borrower" ? "/borrower?message=account-created" : "/lender/onboarding";
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
          lendfolio_role: input.role,
          display_name: input.displayName,
          ...signupConsentMetadata,
        },
      },
    });

    if (error) {
      const errorCode = classifySignupError(error);
      logSignupDiagnosticFailure(error, errorCode, {
        flow: "signup",
        role: input.role,
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
            role: input.role,
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
        return {
          status: "success",
          message: SIGNUP_CONFIRMATION_PENDING_MESSAGE,
          canResendConfirmation: true,
          confirmationEmail: input.email,
        };
      }

      if (isSignupConfirmationDeliveryError(error)) {
        return {
          status: "error",
          message: getSafeSignupErrorMessage("SIGNUP_CONFIRMATION_SEND_FAILED"),
          errorCode: "SIGNUP_CONFIRMATION_SEND_FAILED",
          values: {
            displayName: input.displayName,
            email: input.email,
            role: input.role,
            termsAccepted: true,
            privacyAccepted: true,
          },
        };
      }

      return {
        status: "error",
        message: getSafeSignupErrorMessage(errorCode),
        errorCode,
        values: {
          displayName: input.displayName,
          email: input.email,
          role: input.role,
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

      logSignupFailure({ flow: "signup", role: input.role }, null);

      return {
        status: "error",
        message: "Could not create the account. Try another email or password.",
        errorCode: "SIGNUP_UNEXPECTED",
        values: {
          displayName: input.displayName,
          email: input.email,
          role: input.role,
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

    const [acceptedBaseline, { data: profile }] = await Promise.all([
      acceptBaselineUserConsents(supabase, requestHeaders),
      supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle(),
    ]);

    if (!acceptedBaseline) {
      return {
        status: "success",
        message:
          "Account created. Sign in to finish setting up your workspace.",
      };
    }

    if (profile && profile.role !== input.role) {
      await supabase.auth.signOut();

      return {
        status: "error",
        message: getRoleMismatchMessage(profile.role, input.role),
        errorCode: "SIGNUP_EMAIL_REGISTERED",
        values: {
          displayName: input.displayName,
          email: input.email,
          role: input.role,
          termsAccepted: true,
          privacyAccepted: true,
        },
      };
    }

    redirectTo = destination;
  } catch (error) {
    const errorCode = classifySignupError(error);
    const role = formData.get("role");
    logSignupDiagnosticFailure(error, errorCode, {
      flow: "signup",
      role: isSignupRoleValue(role) ? role : "borrower",
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
        role: String(formData.get("role") ?? ""),
        termsAccepted: formData.get("termsAccepted") === "on",
        privacyAccepted: formData.get("privacyAccepted") === "on",
      },
    };
  }

  redirect(redirectTo, RedirectType.replace);
}

export async function resendSignupConfirmationAction(
  _previousState: ResendSignupConfirmationState,
  formData: FormData,
): Promise<ResendSignupConfirmationState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return {
      status: "error",
      message: "Enter the email address used for signup.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const requestHeaders = await headers();
    const emailRedirectTo = getAuthRedirectUrl(
      "/login?message=email-confirmed",
      requestHeaders,
    );
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      const errorCode = classifySignupError(error);
      logSignupDiagnosticFailure(error, errorCode, {
        flow: "signup",
        role: "borrower",
        source: "resend",
      });

      if (errorCode === "SIGNUP_RATE_LIMITED") {
        return {
          status: "error",
          message: getSafeSignupErrorMessage(errorCode),
          errorCode,
          confirmationEmail: email,
          rateLimitCooldownEndsAt: Date.now() + getSignupRetryDelayMs(error),
        };
      }
    }

    return {
      status: "success",
      message: SIGNUP_CONFIRMATION_RESEND_SUCCESS_MESSAGE,
      confirmationEmail: email,
    };
  } catch (error) {
    const errorCode = classifySignupError(error);
    logSignupDiagnosticFailure(error, errorCode, {
      flow: "signup",
      role: "borrower",
      source: "resend",
    });

    if (errorCode === "SIGNUP_RATE_LIMITED") {
      return {
        status: "error",
        message: getSafeSignupErrorMessage(errorCode),
        errorCode,
        confirmationEmail: email,
        rateLimitCooldownEndsAt: Date.now() + getSignupRetryDelayMs(error),
      };
    }

    return {
      status: "success",
      message: SIGNUP_CONFIRMATION_RESEND_SUCCESS_MESSAGE,
      confirmationEmail: email,
    };
  }
}

export async function signOutForSignupAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Missing auth configuration still lands the user back on signup.
  }

  redirect("/signup", RedirectType.replace);
}

function getRoleMismatchMessage(profileRole: string, selectedRole: string) {
  return `This account is registered as a ${profileRole}. Sign out and use another email to create a ${selectedRole} account.`;
}

function isSignupRoleValue(value: FormDataEntryValue | null): value is "borrower" | "lender" {
  return value === "borrower" || value === "lender";
}

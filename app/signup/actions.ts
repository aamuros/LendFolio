"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  logSignupFailure,
} from "@/lib/auth-signup-errors";
import {
  hasConfirmedEmail,
  isSignupConfirmationDeliveryError,
  isSignupConfirmationPendingError,
  SIGNUP_CHECK_EMAIL_MESSAGE,
  SIGNUP_CONFIRMATION_PENDING_MESSAGE,
  SIGNUP_CONFIRMATION_SEND_FAILED_MESSAGE,
} from "@/lib/auth-confirmation";
import {
  acceptBaselineUserConsents,
  getSignupConsentMetadata,
} from "@/lib/consent-recording";
import { getAuthRedirectUrl } from "@/lib/site-url";
import { signupSchema } from "@/lib/signup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignupErrorCode =
  | "SIGNUP_ENV_MISSING"
  | "SIGNUP_SUPABASE_CONFIG"
  | "SIGNUP_AUTH_PROVIDER"
  | "SIGNUP_DATABASE_TRIGGER"
  | "SIGNUP_REDIRECT_URL"
  | "SIGNUP_EMAIL_REGISTERED"
  | "SIGNUP_CONFIRMATION_SEND_FAILED"
  | "SIGNUP_UNEXPECTED";

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
  confirmationEmail?: string;
  values?: {
    displayName?: string;
    email?: string;
    role?: string;
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
  };
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
        await resendSignupConfirmation(supabase, input.email, emailRedirectTo);

        return {
          status: "success",
          message: SIGNUP_CONFIRMATION_PENDING_MESSAGE,
          confirmationEmail: input.email,
        };
      }

      if (isSignupConfirmationDeliveryError(error)) {
        const resent = await resendSignupConfirmation(
          supabase,
          input.email,
          emailRedirectTo,
        );

        return {
          status: resent ? "success" : "error",
          message: resent
            ? SIGNUP_CHECK_EMAIL_MESSAGE
            : SIGNUP_CONFIRMATION_SEND_FAILED_MESSAGE,
          errorCode: resent ? undefined : "SIGNUP_CONFIRMATION_SEND_FAILED",
          confirmationEmail: resent ? input.email : undefined,
          values: resent
            ? undefined
            : {
                displayName: input.displayName,
                email: input.email,
                role: input.role,
                termsAccepted: true,
                privacyAccepted: true,
              },
        };
      }

      const errorCode = classifySignupError(error);
      logSignupFailure(error, errorCode);

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
    logSignupFailure(error, errorCode);

    return {
      status: "error",
      message: getSafeSignupErrorMessage(errorCode),
      errorCode,
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

function logSignupFailure(error: unknown, errorCode: SignupErrorCode) {
  console.error("Signup failed", {
    message: error instanceof Error ? error.message : getErrorMessage(error) || "Unknown signup error",
    name: error instanceof Error ? error.name : undefined,
    code: errorCode,
  });
}

function classifySignupError(error: unknown): SignupErrorCode {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error).toLowerCase();

  if (
    message.includes("next_public_supabase_url") ||
    message.includes("next_public_supabase_anon_key") ||
    message.includes("missing supabase")
  ) {
    return "SIGNUP_ENV_MISSING";
  }

  if (
    message.includes("invalid url") ||
    message.includes("supabase url") ||
    message.includes("invalid api key") ||
    message.includes("jwt") ||
    message.includes("api key") ||
    code.includes("invalid_credentials")
  ) {
    return "SIGNUP_SUPABASE_CONFIG";
  }

  if (
    message.includes("provider") ||
    message.includes("signup is disabled") ||
    message.includes("signups not allowed") ||
    message.includes("email signups are disabled") ||
    code.includes("signup_disabled")
  ) {
    return "SIGNUP_AUTH_PROVIDER";
  }

  if (
    message.includes("redirect") ||
    message.includes("not allowed") ||
    message.includes("site url") ||
    code.includes("redirect")
  ) {
    return "SIGNUP_REDIRECT_URL";
  }

  if (
    message.includes("already registered") ||
    message.includes("already exists") ||
    code.includes("user_already_exists")
  ) {
    return "SIGNUP_EMAIL_REGISTERED";
  }

  if (
    message.includes("database") ||
    message.includes("trigger") ||
    message.includes("profile") ||
    message.includes("violates") ||
    message.includes("function") ||
    code.startsWith("23") ||
    code.startsWith("42")
  ) {
    return "SIGNUP_DATABASE_TRIGGER";
  }

  return "SIGNUP_UNEXPECTED";
}

function getSafeSignupErrorMessage(errorCode: SignupErrorCode) {
  switch (errorCode) {
    case "SIGNUP_ENV_MISSING":
      return "Signup is not configured yet. Ask the site owner to verify the Supabase URL and anon key.";
    case "SIGNUP_SUPABASE_CONFIG":
      return "Signup cannot connect to the authentication service. Ask the site owner to verify the Supabase project settings.";
    case "SIGNUP_AUTH_PROVIDER":
      return "Email signup is not enabled yet. Ask the site owner to verify the Supabase email provider.";
    case "SIGNUP_DATABASE_TRIGGER":
      return "Signup reached the authentication service, but account setup could not finish. Ask the site owner to verify production database migrations.";
    case "SIGNUP_REDIRECT_URL":
      return "Signup needs the site redirect URL to be allowed before accounts can be created.";
    case "SIGNUP_EMAIL_REGISTERED":
      return "This email is already registered. Sign in or check your email for the confirmation link.";
    case "SIGNUP_CONFIRMATION_SEND_FAILED":
      return SIGNUP_CONFIRMATION_SEND_FAILED_MESSAGE;
    case "SIGNUP_UNEXPECTED":
    default:
      return "Signup could not be completed right now. Try again later or contact support.";
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return "";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }

  return "";
}

async function resendSignupConfirmation(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  email: string,
  emailRedirectTo: string,
) {
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo,
      },
    });

    return !error;
  } catch {
    return false;
  }
}

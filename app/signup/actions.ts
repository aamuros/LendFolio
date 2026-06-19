"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { acceptBaselineUserConsents } from "@/lib/consent-recording";
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

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(
          emailConfirmationRedirect,
          requestHeaders,
        ),
        data: {
          lendfolio_role: input.role,
          display_name: input.displayName,
        },
      },
    });

    if (error || !data.user) {
      return {
        status: "error",
        message: "Could not create the account. Try another email or password.",
        values: {
          displayName: input.displayName,
          email: input.email,
          role: input.role,
          termsAccepted: true,
          privacyAccepted: true,
        },
      };
    }

    if (!data.session || data.user.email_confirmed_at === null) {
      if (data.session) {
        await supabase.auth.signOut();
      }

      return {
        status: "success",
        message:
          "Account created. Check your email to confirm your account, then sign in to continue.",
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
  } catch {
    return {
      status: "error",
      message: "Account signup is temporarily unavailable.",
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

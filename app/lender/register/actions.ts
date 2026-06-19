"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { acceptBaselineUserConsents } from "@/lib/consent-recording";
import { lenderRegisterSchema } from "@/lib/lender-register";
import { getAuthRedirectUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LenderRegisterFieldErrors = Partial<
  Record<
    | "displayName"
    | "email"
    | "organizationName"
    | "password"
    | "confirmPassword",
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

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(
          emailConfirmationRedirect,
          requestHeaders,
        ),
        data: {
          lendfolio_role: "lender",
          display_name: input.displayName,
          organization_name: input.organizationName,
        },
      },
    });

    if (error || !data.user) {
      return {
        status: "error",
        message:
          "Could not create the account. Try another email or password.",
        values: {
          displayName: input.displayName,
          email: input.email,
          organizationName: input.organizationName,
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
      values: {
        displayName: String(formData.get("displayName") ?? ""),
        email: String(formData.get("email") ?? ""),
        organizationName: String(formData.get("organizationName") ?? ""),
      },
    };
  }

  redirect(redirectTo, RedirectType.replace);
}

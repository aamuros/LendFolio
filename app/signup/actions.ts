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
    input.role === "borrower" ? "/borrower?message=account-created" : "/lender/onboarding";
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

    // Verify the provisioned profile role matches the signup role.
    // If provisioning created a different role, redirect to the correct
    // workspace rather than silently sending the user to the wrong one.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile && profile.role !== input.role) {
      redirectTo =
        profile.role === "borrower"
          ? "/borrower?message=account-created"
          : profile.role === "lender"
            ? "/lender/onboarding"
            : destination;
    } else {
      redirectTo = destination;
    }
  } catch {
    return {
      status: "error",
      message: "Account signup is temporarily unavailable.",
    };
  }

  redirect(redirectTo);
}

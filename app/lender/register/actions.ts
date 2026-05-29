"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { acceptBaselineUserConsents } from "@/lib/consent-recording";
import { lenderRegisterSchema } from "@/lib/lender-register";
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
    };
  }

  const input = parsed.data;
  const destination = "/?auth=lender-pending";
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

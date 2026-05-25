"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signupSchema } from "@/lib/signup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignupFieldErrors = Partial<
  Record<
    | "role"
    | "displayName"
    | "organizationName"
    | "email"
    | "password"
    | "confirmPassword",
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
    email: formData.get("email"),
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

    redirectTo = destination;
  } catch {
    return {
      status: "error",
      message: "Account signup is temporarily unavailable.",
    };
  }

  redirect(redirectTo);
}

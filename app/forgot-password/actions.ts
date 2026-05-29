"use server";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  message: string;
  status: "idle" | "error" | "success";
};

export async function forgotPasswordAction(
  _previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return {
      status: "error",
      message: "Enter your email address.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const requestHeaders = await headers();
    const origin =
      requestHeaders.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
  } catch {
    // Swallow errors to avoid leaking account existence.
  }

  return {
    status: "success",
    message:
      "If an account exists for that email, password reset instructions have been sent.",
  };
}

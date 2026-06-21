"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResetPasswordState = {
  message: string;
  status: "idle" | "error" | "success";
};

export async function exchangeResetCodeAction(
  code: string,
): Promise<{ ok: boolean; message: string }> {
  if (!code) {
    return { ok: false, message: "Missing reset code." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return { ok: false, message: "Invalid or expired reset link." };
    }

    return { ok: true, message: "Code verified." };
  } catch {
    return { ok: false, message: "Could not verify reset link." };
  }
}

export async function updatePasswordAction(
  _previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || password.length < 8) {
    return {
      status: "error",
      message: "Password must be at least 8 characters.",
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Passwords must match.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return {
        status: "error",
        message: getPasswordUpdateErrorMessage(error),
      };
    }

    return {
      status: "success",
      message: "Password updated. You can now sign in with your new password.",
    };
  } catch {
    return {
      status: "error",
      message: "Could not update password.",
    };
  }
}

function getPasswordUpdateErrorMessage(error: { message?: string; status?: number }) {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("different from the old password")) {
    return "Choose a password you have not used for this account.";
  }

  if (
    message.includes("weak password") ||
    message.includes("password should be") ||
    message.includes("password must")
  ) {
    return "Choose a stronger password that meets the password requirements.";
  }

  if (
    error.status === 401 ||
    error.status === 403 ||
    message.includes("session") ||
    message.includes("jwt") ||
    message.includes("expired")
  ) {
    return "Your reset link has expired. Request a new link to continue.";
  }

  return "Could not update password. Try again or request a new reset link.";
}

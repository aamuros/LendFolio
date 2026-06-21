"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { getRouteForRole } from "@/lib/app-roles";
import {
  EMAIL_VERIFICATION_LOGIN_MESSAGE,
  hasConfirmedEmail,
} from "@/lib/auth-confirmation";
import { acceptBaselineUserConsents } from "@/lib/consent-recording";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, ProfileStatus } from "@/lib/supabase/types";

export type LoginState = {
  message: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      message: "Enter your email and password.",
    };
  }

  let destination = "/";

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return {
        message: getLoginErrorMessage(error),
      };
    }

    if (!hasConfirmedEmail(data.user)) {
      await supabase.auth.signOut();

      return {
        message: EMAIL_VERIFICATION_LOGIN_MESSAGE,
      };
    }

    const requestHeaders = await headers();

    const [, { data: profile }] = await Promise.all([
      acceptBaselineUserConsents(supabase, requestHeaders),
      supabase
        .from("profiles")
        .select("role, status")
        .eq("id", data.user.id)
        .maybeSingle(),
    ]);

    destination = profile ? getPostLoginDestination(profile) : "/?auth=unknown";
  } catch {
    return {
      message: "Sign in is temporarily unavailable.",
    };
  }

  redirect(destination, RedirectType.replace);
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Missing auth configuration still lands the user back on the login page.
  }

  redirect("/login", RedirectType.replace);
}

function getPostLoginDestination(
  profile: { role: AppRole; status: ProfileStatus },
) {
  if (profile.status !== "active") {
    return "/?auth=access";
  }

  if (profile.role !== "lender") {
    return getRouteForRole(profile.role);
  }

  return "/lender";
}

function getLoginErrorMessage(error: { code?: string; message?: string } | null) {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed") ||
    message.includes("email is not confirmed")
  ) {
    return EMAIL_VERIFICATION_LOGIN_MESSAGE;
  }

  return "Could not sign in. Check your email and password.";
}

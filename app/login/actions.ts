"use server";

import { redirect } from "next/navigation";
import { getRouteForRole } from "@/lib/app-roles";
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
        message: "Could not sign in. Check your email and password.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user.id)
      .maybeSingle();

    destination = profile
      ? await getPostLoginDestination(supabase, data.user.id, profile)
      : "/?auth=unknown";
  } catch {
    return {
      message: "Sign in is temporarily unavailable.",
    };
  }

  redirect(destination);
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Missing auth configuration still lands the user back on the login page.
  }

  redirect("/login?message=signed-out");
}

async function getPostLoginDestination(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  profile: { role: AppRole; status: ProfileStatus },
) {
  if (profile.status !== "active") {
    return "/?auth=access";
  }

  if (profile.role !== "lender") {
    return getRouteForRole(profile.role);
  }

  const { data: lenderProfile } = await supabase
    .from("lender_profiles")
    .select("verification_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (lenderProfile?.verification_status === "approved") {
    return getRouteForRole(profile.role);
  }

  return "/?auth=lender-pending";
}

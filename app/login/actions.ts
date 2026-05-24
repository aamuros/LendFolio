"use server";

import { redirect } from "next/navigation";
import { getRouteForRole } from "@/lib/app-roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    destination = profile ? getRouteForRole(profile.role) : "/?auth=unknown";
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

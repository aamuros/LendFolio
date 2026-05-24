"use server";

import { redirect } from "next/navigation";
import { getDemoRedirectForEmail } from "@/lib/demo-roles";
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
      message: "Enter the demo email and the password set in Supabase Auth.",
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
        message:
          "Could not sign in. Check the demo email and the password set in Supabase Auth.",
      };
    }

    destination = getDemoRedirectForEmail(data.user.email) ?? "/?auth=unknown";
  } catch {
    return {
      message:
        "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  redirect(destination);
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Missing Supabase env still lands the user back on the login page.
  }

  redirect("/login?message=signed-out");
}

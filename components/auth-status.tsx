import Link from "next/link";
import { signOutAction } from "@/app/login/actions";
import { getPortalConfig } from "@/lib/app-roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/types";

type AuthStatusProps = {
  role: AppRole;
};

export async function AuthStatus({ role }: AuthStatusProps) {
  const config = getPortalConfig(role);
  const status = await getAuthStatus();

  if (!config) {
    return null;
  }

  return (
    <section className="grid gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid gap-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
          Account
        </p>
        {status.email ? (
          <p className="break-words text-sm font-semibold">{status.email}</p>
        ) : (
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {status.message}
          </p>
        )}
      </div>

      {status.email ? (
        <form action={signOutAction}>
          <button
            type="submit"
            className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Sign out
          </button>
        </form>
      ) : (
        <Link
          href={config.loginRoute}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          Sign in
        </Link>
      )}
    </section>
  );
}

async function getAuthStatus() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return {
        email: null,
        message: "Sign in to continue.",
      };
    }

    return {
      email: user.email,
      message: "",
    };
  } catch {
    return {
      email: null,
      message: "Sign in is temporarily unavailable.",
    };
  }
}

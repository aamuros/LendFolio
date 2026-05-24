import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";
import { getPortalConfig, portalConfigs } from "@/lib/app-roles";
import type { AppRole } from "@/lib/supabase/types";

type LoginPageProps = {
  searchParams?: Promise<{
    role?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const selectedRole = getRoleParam(params?.role);
  const selectedConfig = selectedRole ? getPortalConfig(selectedRole) : undefined;

  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-3rem)] max-w-4xl content-center gap-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            &lt;- LendFolio
          </Link>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
            Login
          </p>
        </header>

        <section className="grid gap-4">
          <div className="grid gap-3">
            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Sign in
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Use your email and password to access LendFolio.
            </p>
          </div>
        </section>

        {params?.message === "signed-out" ? (
          <p
            className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
            role="status"
          >
            Signed out.
          </p>
        ) : null}

        <section className="grid gap-6 border-y border-[var(--border)] py-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-5">
            <LoginForm />
          </div>

          <aside className="grid content-start gap-3 text-sm leading-6 text-[var(--muted-foreground)]">
            <p className="font-semibold text-[var(--foreground)]">
              {selectedConfig?.title ?? "Access your workspace"}
            </p>
            <p>
              {selectedConfig?.description ??
                "Borrowers, lenders, and managers use the same secure login."}
            </p>
            <div className="grid gap-2 border-t border-[var(--border)] pt-3">
              {portalConfigs.map((portal) => (
                <Link
                  key={portal.role}
                  href={portal.loginRoute}
                  className="text-sm font-semibold text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
                >
                  {portal.title}
                </Link>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function getRoleParam(role?: string): AppRole | undefined {
  if (role === "borrower" || role === "lender" || role === "manager") {
    return role;
  }

  return undefined;
}

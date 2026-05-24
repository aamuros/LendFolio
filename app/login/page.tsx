import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";
import { demoRoles, getDemoRole, type DemoRole } from "@/lib/demo-roles";

type LoginPageProps = {
  searchParams?: Promise<{
    role?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const selectedRole = getRoleParam(params?.role);
  const selectedConfig = selectedRole ? getDemoRole(selectedRole) : undefined;
  const defaultEmail = selectedConfig?.demoEmail ?? "";

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
            ADI-14
          </p>
        </header>

        <section className="grid gap-4">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Supabase Auth
          </p>
          <div className="grid gap-3">
            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Demo sign-in
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Use one of the demo emails and the password set manually in
              Supabase Auth. Passwords are not stored in this repository.
            </p>
          </div>
        </section>

        {params?.message === "signed-out" ? (
          <p
            className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
            role="status"
          >
            Signed out. Sign in again to continue the Supabase-backed flow.
          </p>
        ) : null}

        <section className="grid gap-6 border-y border-[var(--border)] py-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-5">
            <LoginForm defaultEmail={defaultEmail} />
          </div>

          <aside className="grid content-start gap-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
              Demo accounts
            </p>
            {demoRoles.map((role) => (
              <Link
                key={role.role}
                href={role.loginRoute}
                className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 transition-colors hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
              >
                <span className="block font-semibold">
                  Sign in as {role.title}
                </span>
                <span className="block break-words text-[var(--muted-foreground)]">
                  {role.demoEmail}
                </span>
              </Link>
            ))}
          </aside>
        </section>
      </div>
    </main>
  );
}

function getRoleParam(role?: string): DemoRole | undefined {
  if (role === "borrower" || role === "lender" || role === "manager") {
    return role;
  }

  return undefined;
}

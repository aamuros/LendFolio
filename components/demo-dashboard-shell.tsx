import Link from "next/link";
import type { ReactNode } from "react";
import type { DemoRoleConfig } from "@/lib/demo-roles";

type DemoDashboardShellProps = {
  config: DemoRoleConfig;
  children?: ReactNode;
};

export function DemoDashboardShell({ config, children }: DemoDashboardShellProps) {
  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-4xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            &lt;- LendFolio
          </Link>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
            Demo shell
          </p>
        </header>

        <section className="grid flex-1 content-center gap-8 py-8">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Current role
            </p>
            <h1 className="mt-3 text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              {config.title} dashboard
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              This route is a placeholder shell until manager monitoring is in
              scope. Supabase demo sign-in is available for end-to-end testing.
            </p>
          </div>

          {children}

          <div className="grid gap-5 border-y border-[var(--border)] py-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
                Demo account
              </p>
              <p className="mt-2 break-words text-lg font-semibold">
                {config.demoEmail}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
                Current state
              </p>
              <p className="mt-2 text-lg font-semibold">{config.state}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
                Later sprint
              </p>
              <p className="mt-2 text-lg font-semibold">
                {config.laterSprint}
              </p>
            </div>
          </div>

          <section aria-labelledby="next-action" className="max-w-2xl">
            <h2 id="next-action" className="text-2xl font-semibold">
              Next intended action
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
              {config.nextAction}
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}

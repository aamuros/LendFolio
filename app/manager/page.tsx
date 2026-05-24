import { AuthStatus } from "@/components/auth-status";
import { requireManager } from "@/lib/access-control";
import { loadManagerActiveLoans } from "@/lib/active-loans";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const [access, activeLoansResult] = await Promise.all([
    requireManager(),
    loadManagerActiveLoans(),
  ]);
  const activeLoans = activeLoansResult.ok ? activeLoansResult.loans : [];

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
            Manager
          </p>
        </header>

        <section className="grid gap-5">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Manager workspace
          </p>
          <div className="grid gap-4">
            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Manager dashboard
            </h1>
            {access.ok ? (
              <div className="grid gap-4">
                <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
                  Platform oversight tools will appear here as they are released.
                </p>
                <section className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold">Active loans</h2>
                    <span className="text-2xl font-semibold">
                      {activeLoans.length}
                    </span>
                  </div>
                  {activeLoans.length > 0 ? (
                    <div className="grid gap-3">
                      {activeLoans.slice(0, 3).map((loan) => (
                        <div
                          key={loan.id}
                          className="grid gap-1 border-t border-[var(--border)] pt-3 text-sm"
                        >
                          <p className="font-semibold">
                            PHP {formatCurrency(loan.principalAmount)}
                          </p>
                          <p className="text-[var(--muted-foreground)]">
                            Due {formatDateOnly(loan.dueDate)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      No active loans yet.
                    </p>
                  )}
                </section>
              </div>
            ) : (
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
                {access.message}
              </p>
            )}
          </div>
        </section>

        <AuthStatus role="manager" />
      </div>
    </main>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

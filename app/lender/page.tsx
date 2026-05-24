import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { getDemoRole } from "@/lib/demo-roles";
import { loadOpenLenderApplications } from "@/lib/lender-applications";

export const dynamic = "force-dynamic";

export default async function LenderPage() {
  const config = getDemoRole("lender");

  if (!config) {
    return null;
  }

  const result = await loadOpenLenderApplications();

  if (result.mode === "local-placeholder") {
    return (
      <main className="min-h-svh px-5 py-6 sm:px-8">
        <div className="mx-auto grid max-w-4xl gap-8">
          <DashboardHeader />
          <LenderHero />
          <AuthStatus role="lender" />
          <LenderApplicationsStatus message={result.message} tone="error" />
          <LenderApplicationsList applications={[]} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto grid max-w-4xl gap-8">
        <DashboardHeader />
        <LenderHero />
        <AuthStatus role="lender" />

        <section className="grid gap-5 border-y border-[var(--border)] py-6 sm:grid-cols-3">
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
            <p className="mt-2 text-lg font-semibold">
              Application browsing
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
              Not in ADI-11
            </p>
            <p className="mt-2 text-lg font-semibold">Offer creation</p>
          </div>
        </section>

        <section className="grid gap-5">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-sm font-semibold text-[var(--accent)]">
                Review queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Submitted applications
              </h2>
            </div>
            <Link
              href="/lender/applications"
              className="text-sm font-semibold text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            >
              Open full list
            </Link>
          </div>
          <LenderApplicationsStatus
            message={result.ok ? result.message : result.message}
            tone={result.ok ? "neutral" : "error"}
          />
          <LenderApplicationsList applications={result.applications} />
        </section>
      </div>
    </main>
  );
}

function DashboardHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        href="/"
        className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      >
        &lt;- LendFolio
      </Link>
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
        ADI-11
      </p>
    </header>
  );
}

function LenderHero() {
  return (
    <section className="grid gap-5 pt-4">
      <p className="text-sm font-semibold text-[var(--accent)]">
        Lender dashboard
      </p>
      <div className="grid gap-4">
        <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
          Browse borrower applications
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Review submitted and open loan requests with business profile and
          financial context only. Borrower direct contact details are excluded.
        </p>
      </div>
    </section>
  );
}

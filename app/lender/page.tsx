import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { RouteStatusToast } from "@/components/route-status-toast";
import { loadOpenLenderApplications } from "@/lib/lender-applications";

export const dynamic = "force-dynamic";

export default async function LenderPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const result = await loadOpenLenderApplications();

  if (result.mode === "auth") {
    return (
      <main className="min-h-svh px-5 py-6 sm:px-8">
        <div className="mx-auto grid max-w-4xl gap-8">
          <DashboardHeader />
          <RouteStatusToast
            message={message === "signed-in" ? "Signed in successfully." : ""}
          />
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
        <RouteStatusToast
          message={message === "signed-in" ? "Signed in successfully." : ""}
        />
        <LenderHero />
        <AuthStatus role="lender" />

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
          {!result.ok ? (
            <LenderApplicationsStatus message={result.message} tone="error" />
          ) : null}
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
        Lender
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
          Applications
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Review borrower requests and send offers.
        </p>
      </div>
    </section>
  );
}

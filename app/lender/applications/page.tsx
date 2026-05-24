import Link from "next/link";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { loadOpenLenderApplications } from "@/lib/lender-applications";

export const dynamic = "force-dynamic";

export default async function LenderApplicationsPage() {
  const result = await loadOpenLenderApplications();

  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto grid max-w-4xl gap-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/lender"
            className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            &lt;- Lender dashboard
          </Link>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
            Applications
          </p>
        </header>

        <section className="grid gap-4 pt-4">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Review queue
          </p>
          <div className="grid gap-3">
            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Open applications
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Browse submitted borrower requests and open one application to
              review business and financial context before making an offer.
            </p>
          </div>
        </section>

        <LenderApplicationsStatus
          message={result.message}
          tone={result.ok ? "neutral" : "error"}
        />
        <LenderApplicationsList applications={result.applications} />
      </div>
    </main>
  );
}

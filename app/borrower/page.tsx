import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";
import { RouteStatusToast } from "@/components/route-status-toast";
import { requireBorrower } from "@/lib/access-control";

export const dynamic = "force-dynamic";

export default async function BorrowerPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const access = await requireBorrower();

  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto grid max-w-4xl gap-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            &lt;- LendFolio
          </Link>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
            Borrower
          </p>
        </header>
        <RouteStatusToast
          message={message === "signed-in" ? "Signed in successfully." : ""}
        />

        <section className="grid gap-5 pt-4">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Borrower workspace
          </p>
          <div className="grid gap-4">
            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Business profile
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Add your business details to request financing.
            </p>
          </div>
        </section>

        <AuthStatus role="borrower" />
        {access.ok ? (
          <>
            <BorrowerPortfolioForm />
            <BorrowerLoanApplicationPanel />
          </>
        ) : (
          <section
            className="rounded-md border border-[var(--border)] bg-white px-4 py-4 text-sm leading-6 text-[var(--muted-foreground)]"
            role="alert"
          >
            {access.message}
          </section>
        )}
      </div>
    </main>
  );
}

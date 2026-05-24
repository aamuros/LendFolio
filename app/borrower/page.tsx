import Link from "next/link";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";
import { getDemoRole } from "@/lib/demo-roles";

export default function BorrowerPage() {
  const config = getDemoRole("borrower");

  if (!config) {
    return null;
  }

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
            ADI-13
          </p>
        </header>

        <section className="grid gap-5 pt-4">
          <p className="text-sm font-semibold text-[var(--accent)]">
            {config.title} dashboard
          </p>
          <div className="grid gap-4">
            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Build your portfolio and request financing
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Save the business profile first, then submit one Sprint 1 loan
              application for lender demo review. You can now review and accept
              one pending offer; active loans, repayment, and manager tools
              remain outside this issue.
            </p>
          </div>
        </section>

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
              Portfolio and loan request
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
              Not in ADI-13
            </p>
            <p className="mt-2 text-lg font-semibold">
              Active loans and repayments
            </p>
          </div>
        </section>

        <BorrowerPortfolioForm />
        <BorrowerLoanApplicationPanel />
      </div>
    </main>
  );
}

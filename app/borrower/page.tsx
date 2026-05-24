import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";
import { BorrowerWorkspace } from "@/components/borrower-workspace";
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
    <main className="min-h-svh px-5 pt-5 pb-32 sm:px-8 sm:pt-7">
      <div className="mx-auto grid max-w-4xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Go to LendFolio home"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>LendFolio</span>
          </Link>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
            Borrower
          </p>
        </header>

        <section className="grid gap-3 pt-2">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Borrower workspace
          </p>
          <div className="grid gap-2">
            <h1 className="text-3xl leading-tight font-semibold text-balance sm:text-5xl">
              Financing dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base sm:leading-7">
              Manage your profile, application, and lender offers in one place.
            </p>
          </div>
        </section>

        <AuthStatus role="borrower" />
        {access.ok ? (
          <BorrowerWorkspace
            routeMessage={
              message === "signed-in" ? "Signed in successfully." : ""
            }
          />
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

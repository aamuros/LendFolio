"use client";

import Link from "next/link";

export default function LenderApplicationsError() {
  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto grid max-w-4xl gap-6">
        <Link
          href="/lender"
          className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          &lt;- Lender dashboard
        </Link>
        <section className="rounded-md border border-[var(--border)] bg-white px-4 py-6">
          <h1 className="text-2xl font-semibold">
            Applications could not load
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
            Please try again in a moment.
          </p>
        </section>
      </div>
    </main>
  );
}

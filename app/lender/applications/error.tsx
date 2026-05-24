"use client";

import Link from "next/link";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";

export default function LenderApplicationsError() {
  return (
    <main className="min-h-svh px-5 pt-4 pb-28 sm:px-8 sm:pt-6">
      <div className="mx-auto grid max-w-4xl gap-5">
        <Link
          href="/lender"
          className="text-sm font-semibold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          LendFolio
        </Link>
        <section className="rounded-3xl border border-[var(--border)] bg-white px-5 py-6 shadow-sm">
          <h1 className="text-2xl font-semibold">
            Applications could not load
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
            Please try again in a moment.
          </p>
        </section>
        <LenderBottomTabs activeTab="applications" />
      </div>
    </main>
  );
}

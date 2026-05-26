import Link from "next/link";
import type { ReactNode } from "react";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" version="2026-05-privacy-v1">
      <p>
        LendFolio uses account, profile, application, offer, verification, and
        workflow information to operate the financing process.
      </p>
      <p>
        The platform limits workspace access by role and lender approval status.
        Required consent records are stored with the accepted version and basic
        request metadata.
      </p>
      <p>
        Users should submit only information needed for account access,
        borrower review, lender review, and application decisions.
      </p>
    </LegalPage>
  );
}

function LegalPage({
  title,
  version,
  children,
}: {
  title: string;
  version: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-svh bg-[var(--background)] px-5 py-8 sm:px-8">
      <article className="mx-auto grid max-w-3xl gap-6 rounded-lg border border-[var(--border)] bg-white px-5 py-6 shadow-sm sm:px-7">
        <div className="grid gap-2">
          <Link
            href="/signup"
            className="w-fit rounded-sm text-sm font-medium text-[var(--muted-foreground)] underline-offset-4 hover:text-[var(--foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Back to signup
          </Link>
          <h1 className="text-3xl leading-tight font-semibold">{title}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Current version: {version}
          </p>
        </div>
        <div className="grid gap-4 text-sm leading-6 text-[var(--muted-foreground)]">
          {children}
        </div>
      </article>
    </main>
  );
}

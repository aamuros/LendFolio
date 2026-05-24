"use client";

import { useState } from "react";
import { signOutAction } from "@/app/login/actions";
import {
  BorrowerBottomTabs,
  type BorrowerTab,
} from "@/components/borrower-bottom-tabs";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";

type BorrowerWorkspaceProps = {
  accountEmail?: string;
};

export function BorrowerWorkspace({ accountEmail = "" }: BorrowerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BorrowerTab>("home");

  function changeTab(tab: BorrowerTab) {
    setActiveTab(tab);
  }

  return (
    <div className="grid gap-5">
      <header className="flex min-h-10 items-center justify-between gap-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          LendFolio
        </p>
        <button
          type="button"
          aria-label="Open profile"
          onClick={() => changeTab("profile")}
          className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </button>
      </header>

      {activeTab === "home" ? (
        <BorrowerLoanApplicationPanel view="home" onNavigate={changeTab} />
      ) : null}

      {activeTab === "profile" ? (
        <section className="grid gap-4">
          <SectionHeader
            title="Business profile"
            description="Keep your business details current before requesting financing."
          />
          <BorrowerPortfolioForm />
          <AccountSection email={accountEmail} />
        </section>
      ) : null}

      {activeTab === "apply" ? (
        <BorrowerLoanApplicationPanel view="apply" onNavigate={changeTab} />
      ) : null}

      {activeTab === "offers" ? (
        <BorrowerLoanApplicationPanel view="offers" onNavigate={changeTab} />
      ) : null}

      <BorrowerBottomTabs activeTab={activeTab} onTabChange={changeTab} />
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-1">
      <h2 className="text-2xl leading-tight font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

function AccountSection({ email }: { email: string }) {
  return (
    <section className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
      <div className="grid gap-1">
        <h3 className="text-lg font-semibold">Account</h3>
        <p className="break-words text-sm text-[var(--muted-foreground)]">
          {email || "Signed in"}
        </p>
      </div>
      <div className="grid gap-3 rounded-2xl border border-[var(--border)] px-4 py-3">
        <AccountRow label="Role" value="Borrower" />
        <AccountRow label="Status" value="Active" />
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2 last:border-0">
      <p className="text-sm font-semibold text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="text-right text-sm font-semibold">{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import {
  loadBorrowerLoanApplications,
  type LoanApplicationsLoadResult,
} from "@/app/borrower/actions";
import { signOutAction } from "@/app/login/actions";
import {
  BorrowerBottomTabs,
  type BorrowerTab,
} from "@/components/borrower-bottom-tabs";
import { CreditProfileSection } from "@/components/borrower-credit-summary";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerVerificationDocumentsPanel } from "@/components/borrower-verification-documents-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";
import { NotificationButton } from "@/components/notification-button";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import type { BorrowerCreditSummary } from "@/lib/credit-limit";

type BorrowerWorkspaceProps = {
  accountEmail?: string;
  initialLoanApplications?: LoanApplicationsLoadResult | null;
};

export function BorrowerWorkspace({
  accountEmail = "",
  initialLoanApplications = null,
}: BorrowerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BorrowerTab>("home");
  const [isPending, startTransition] = useTransition();
  const [creditSummary, setCreditSummary] =
    useState<BorrowerCreditSummary | null>(
      initialLoanApplications?.creditSummary ?? null,
    );
  const workspaceTab = activeTab === "profile" ? "home" : activeTab;

  useEffect(() => {
    let isActive = true;

    function loadCreditSummary() {
      startTransition(() => {
        void loadBorrowerLoanApplications().then((result) => {
          if (!isActive) {
            return;
          }

          setCreditSummary(result.creditSummary);
        });
      });
    }

    window.addEventListener(borrowerPortfolioSavedEvent, loadCreditSummary);

    return () => {
      isActive = false;
      window.removeEventListener(borrowerPortfolioSavedEvent, loadCreditSummary);
    };
  }, [startTransition]);

  useEffect(() => {
    if (activeTab !== "profile") {
      return;
    }

    let isActive = true;

    startTransition(() => {
      void loadBorrowerLoanApplications().then((result) => {
        if (!isActive) {
          return;
        }

        setCreditSummary(result.creditSummary);
      });
    });

    return () => {
      isActive = false;
    };
  }, [activeTab, startTransition]);

  function changeTab(tab: BorrowerTab) {
    setActiveTab(tab);
  }

  function scrollToBusinessProfile() {
    document
      .getElementById("business-profile")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid gap-5">
      <header className="flex min-h-10 items-center justify-between gap-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          LendFolio
        </p>
        <div className="flex items-center gap-2">
          <NotificationButton />
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
        </div>
      </header>

      {activeTab === "profile" ? (
        <section className="grid gap-4">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => changeTab("home")}
              className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
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
              Back
            </button>
            <SectionHeader
              title="Business profile"
              description="Keep your business details current before requesting financing."
            />
          </div>
          <div id="business-profile">
            <BorrowerPortfolioForm />
          </div>
          {creditSummary ? (
            <CreditProfileSection
              summary={creditSummary}
              onUpdateProfile={scrollToBusinessProfile}
            />
          ) : (
            <CreditProfilePlaceholder isPending={isPending} />
          )}
          <BorrowerVerificationDocumentsPanel
            verification={initialLoanApplications?.borrowerVerification ?? null}
            consentStatus={
              initialLoanApplications?.consentStatuses?.borrowerDocumentUpload ??
              null
            }
          />
          <AccountSection email={accountEmail} />
        </section>
      ) : (
        <BorrowerLoanApplicationPanel
          view={workspaceTab}
          onNavigate={changeTab}
          initialLoadResult={initialLoanApplications}
        />
      )}

      <BorrowerBottomTabs activeTab={activeTab} onTabChange={changeTab} />
    </div>
  );
}

function CreditProfilePlaceholder({ isPending }: { isPending: boolean }) {
  return (
    <section className="grid gap-2 rounded-3xl border border-dashed border-[var(--border)] bg-white px-5 py-5 text-sm leading-6 text-[var(--muted-foreground)]">
      <h3 className="text-lg font-semibold text-[var(--foreground)]">
        Credit profile
      </h3>
      <p>
        {isPending
          ? "Loading your credit profile."
          : "Save your business profile to see your available request amount."}
      </p>
    </section>
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

"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import {
  loadBorrowerPortfolio,
  loadBorrowerLoanApplications,
  type LoanApplicationsLoadResult,
} from "@/app/borrower/actions";
import { signOutAction } from "@/app/login/actions";
import {
  BorrowerBottomTabs,
  type BorrowerTab,
} from "@/components/borrower-bottom-tabs";
import { BorrowerLoanApplicationPanel } from "@/components/borrower-loan-application-panel";
import { BorrowerVerificationDocumentsPanel } from "@/components/borrower-verification-documents-panel";
import { BorrowerPortfolioForm } from "@/components/borrower-portfolio-form";
import { NotificationButton } from "@/components/notification-button";
import {
  businessTypeLabels,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import { borrowerVerificationStatusLabels } from "@/lib/borrower-verification";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import {
  formatCreditAmount,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";

type ProfileMode = "summary" | "edit" | "verification";
type PortfolioLoadState = "loading" | "ready" | "empty" | "error";

type BorrowerWorkspaceProps = {
  accountEmail?: string;
  initialLoanApplications?: LoanApplicationsLoadResult | null;
};

export function BorrowerWorkspace({
  accountEmail = "",
  initialLoanApplications = null,
}: BorrowerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BorrowerTab>("home");
  const [profileMode, setProfileMode] = useState<ProfileMode>("summary");
  const [portfolioLoadState, setPortfolioLoadState] =
    useState<PortfolioLoadState>("loading");
  const [portfolio, setPortfolio] = useState<BorrowerPortfolioInput | null>(
    null,
  );
  const [portfolioMessage, setPortfolioMessage] = useState("");
  const [, startTransition] = useTransition();
  const [creditSummary, setCreditSummary] =
    useState<BorrowerCreditSummary | null>(
      initialLoanApplications?.creditSummary ?? null,
    );
  const [readiness, setReadiness] = useState<BorrowerReadinessResult | null>(
    initialLoanApplications?.readiness ?? null,
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
          setReadiness(result.readiness);
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
        setReadiness(result.readiness);
      });
    });

    return () => {
      isActive = false;
    };
  }, [activeTab, startTransition]);

  function changeTab(tab: BorrowerTab) {
    setActiveTab(tab);
    if (tab !== "profile") {
      setProfileMode("summary");
    }
  }

  useEffect(() => {
    if (activeTab !== "profile") {
      return;
    }

    let isActive = true;

    startTransition(() => {
      void loadBorrowerPortfolio().then((result) => {
        if (!isActive) {
          return;
        }

        if (result.ok && result.data) {
          setPortfolio(result.data);
          setPortfolioLoadState("ready");
          setPortfolioMessage("");
          return;
        }

        setPortfolio(null);
        setPortfolioLoadState(result.ok ? "empty" : "error");
        setPortfolioMessage(result.message);
      });
    });

    return () => {
      isActive = false;
    };
  }, [activeTab, startTransition]);

  function openProfileEdit() {
    setProfileMode("edit");
    requestAnimationFrame(() => {
      document
        .getElementById("business-profile-edit")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handlePortfolioSaved(savedPortfolio: BorrowerPortfolioInput) {
    setPortfolio(savedPortfolio);
    setPortfolioLoadState("ready");
    setPortfolioMessage("");
    setProfileMode("summary");
  }

  return (
    <div className="grid gap-5 pb-28 sm:pb-32">
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
              title={profileMode === "edit" ? "Edit profile" : "Profile"}
              description={
                profileMode === "edit"
                  ? "Update the essentials lenders use to review your business."
                  : "Review your business, verification, and account settings."
              }
            />
          </div>
          {profileMode === "edit" ? (
            <div id="business-profile-edit">
              <BorrowerPortfolioForm
                onCancel={() => setProfileMode("summary")}
                onSaved={handlePortfolioSaved}
              />
            </div>
          ) : profileMode === "verification" ? (
            <section className="grid gap-3" aria-label="Verification details">
              <button
                type="button"
                onClick={() => setProfileMode("summary")}
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
                Profile summary
              </button>
              <BorrowerVerificationDocumentsPanel
                verification={initialLoanApplications?.borrowerVerification ?? null}
                consentStatus={
                  initialLoanApplications?.consentStatuses
                    ?.borrowerDocumentUpload ?? null
                }
              />
            </section>
          ) : (
            <BorrowerProfileHub
              accountEmail={accountEmail}
              creditSummary={creditSummary}
              loadState={portfolioLoadState}
              message={portfolioMessage}
              onEditProfile={openProfileEdit}
              onManageVerification={() => setProfileMode("verification")}
              portfolio={portfolio}
              readiness={readiness}
              result={initialLoanApplications}
            />
          )}
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

function BorrowerProfileHub({
  accountEmail,
  creditSummary,
  loadState,
  message,
  onEditProfile,
  onManageVerification,
  portfolio,
  readiness,
  result,
}: {
  accountEmail: string;
  creditSummary: BorrowerCreditSummary | null;
  loadState: PortfolioLoadState;
  message: string;
  onEditProfile: () => void;
  onManageVerification: () => void;
  portfolio: BorrowerPortfolioInput | null;
  readiness: BorrowerReadinessResult | null;
  result: LoanApplicationsLoadResult | null;
}) {
  const status = getProfileStatus(loadState, portfolio, readiness);
  const verification = result?.borrowerVerification ?? null;
  const verificationLabel =
    verification && verification.status !== "missing"
      ? borrowerVerificationStatusLabels[verification.status]
      : "Not started";
  const verificationDetail =
    verification?.status === "approved"
      ? "Borrower verification is approved."
      : verification?.documentPolicy.missingRequiredDocumentTypes.length
        ? "Upload required documents for review."
        : "Manage borrower verification documents.";

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-2">
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            <div className="grid gap-1">
              <h3 className="text-lg leading-tight font-semibold">
                {status.title}
              </h3>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                {status.description}
              </p>
            </div>
          </div>
          {status.actionLabel ? (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
            >
              {status.actionLabel}
            </button>
          ) : null}
        </div>
        {creditSummary ? (
          <div className="grid gap-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--muted-foreground)]">
              Available to request
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCreditAmount(creditSummary.availableCredit)}
            </p>
          </div>
        ) : null}
      </section>

      {loadState === "loading" ? (
        <ProfileHubSkeleton />
      ) : loadState === "error" ? (
        <section
          className="rounded-3xl border border-[var(--border)] bg-white px-5 py-5 text-sm leading-6 text-[var(--muted-foreground)] shadow-sm"
          role="alert"
        >
          {message || "Could not load your profile."}
        </section>
      ) : (
        <div className="grid gap-3">
          <ProfileSummarySection
            actionLabel={portfolio ? "Edit" : "Add"}
            onAction={onEditProfile}
            title="Business details"
          >
            <ProfileSummaryRow
              label="Business name"
              value={portfolio?.businessName || "Not provided"}
            />
            <ProfileSummaryRow
              label="Business type"
              value={
                portfolio
                  ? businessTypeLabels[portfolio.businessType]
                  : "Not provided"
              }
            />
            <ProfileSummaryRow
              label="Business location"
              value={portfolio?.location || "Not provided"}
            />
            <ProfileSummaryRow
              label="Years in operation"
              value={
                portfolio
                  ? formatYearsInOperation(portfolio.yearsInOperation)
                  : "Not provided"
              }
            />
          </ProfileSummarySection>

          <ProfileSummarySection
            actionLabel={portfolio ? "Edit" : "Add"}
            onAction={onEditProfile}
            title="Financial snapshot"
          >
            <ProfileSummaryRow
              label="Monthly gross revenue"
              value={
                portfolio
                  ? formatCreditAmount(portfolio.monthlyGrossRevenue)
                  : "Not provided"
              }
            />
            <ProfileSummaryRow
              label="Monthly expenses"
              value={
                portfolio
                  ? formatCreditAmount(portfolio.monthlyExpenses)
                  : "Not provided"
              }
            />
            <ProfileSummaryRow
              label="Existing monthly loan payments"
              value={
                portfolio
                  ? formatCreditAmount(portfolio.existingLoanPayments)
                  : "Not provided"
              }
            />
          </ProfileSummarySection>

          <ProfileSummarySection
            actionLabel={portfolio ? "Edit" : "Add"}
            onAction={onEditProfile}
            title="Loan purpose"
          >
            <p className="text-sm leading-6 text-[var(--foreground)]">
              {portfolio?.loanPurposeContext || "Not provided"}
            </p>
          </ProfileSummarySection>

          <ProfileSummarySection
            actionLabel="Manage"
            onAction={onManageVerification}
            title="Verification"
          >
            <ProfileSummaryRow label="Status" value={verificationLabel} />
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {verificationDetail}
            </p>
          </ProfileSummarySection>
        </div>
      )}
      <AccountSection email={accountEmail} />
    </div>
  );
}

function ProfileSummarySection({
  actionLabel,
  children,
  onAction,
  title,
}: {
  actionLabel: string;
  children: ReactNode;
  onAction: () => void;
  title: string;
}) {
  return (
    <section className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-9 items-center gap-1 rounded-full border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          {actionLabel}
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
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function ProfileSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2 last:border-0">
      <p className="text-sm font-semibold text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="max-w-[60%] text-right text-sm font-semibold break-words">
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "attention" | "ready" | "neutral";
}) {
  const className =
    tone === "ready"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "attention"
        ? "bg-amber-50 text-amber-800"
        : "bg-[var(--muted)] text-[var(--muted-foreground)]";

  return (
    <span
      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function ProfileHubSkeleton() {
  return (
    <section
      className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm"
      aria-busy="true"
      aria-label="Loading profile summary"
    >
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="h-4 w-full max-w-sm" />
      <SkeletonBlock className="h-4 w-2/3" />
    </section>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-[var(--muted)] ${className}`}
    />
  );
}

function getProfileStatus(
  loadState: PortfolioLoadState,
  portfolio: BorrowerPortfolioInput | null,
  readiness: BorrowerReadinessResult | null,
) {
  if (loadState === "loading") {
    return {
      tone: "neutral" as const,
      label: "Loading",
      title: "Loading profile",
      description: "Checking your saved business details.",
      actionLabel: null,
    };
  }

  if (loadState === "error") {
    return {
      tone: "attention" as const,
      label: "Needs attention",
      title: "Profile unavailable",
      description: "Your profile could not be loaded right now.",
      actionLabel: "Update profile",
    };
  }

  if (!portfolio || loadState === "empty") {
    return {
      tone: "attention" as const,
      label: "Profile incomplete",
      title: "Complete your borrower profile",
      description: "Add the essential business details lenders need first.",
      actionLabel: "Complete profile",
    };
  }

  if (
    readiness?.readinessStatus === "needs_review" ||
    readiness?.readinessStatus === "not_eligible"
  ) {
    return {
      tone: "attention" as const,
      label: "Needs attention",
      title: "Review your profile",
      description:
        readiness.nextActions[0] ??
        "Some profile details may affect loan application readiness.",
      actionLabel: "Review details",
    };
  }

  if (readiness?.readinessStatus === "incomplete") {
    return {
      tone: "attention" as const,
      label: "Profile incomplete",
      title: "Finish your profile",
      description:
        readiness.nextActions[0] ?? "A few required details are still missing.",
      actionLabel: "Complete profile",
    };
  }

  return {
    tone: "ready" as const,
    label: "Profile ready",
    title: "Business profile is saved",
    description: "Your essential borrower details are ready for loan review.",
    actionLabel: null,
  };
}

function formatYearsInOperation(value: number) {
  if (value === 1) {
    return "1 year";
  }

  return `${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 1,
  }).format(value)} years`;
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
    <section className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
      <h3 className="text-base font-semibold">Account</h3>
      <p className="break-words text-sm text-[var(--muted-foreground)]">
        {email || "Signed in"}
      </p>
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

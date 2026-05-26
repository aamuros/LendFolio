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

type ProfileMode =
  | "index"
  | "edit"
  | "business"
  | "financial"
  | "borrowingPower"
  | "verification"
  | "account"
  | "support";
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
  const [profileMode, setProfileMode] = useState<ProfileMode>("index");
  const [editReturnMode, setEditReturnMode] = useState<ProfileMode>("index");
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
      setProfileMode("index");
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

  function openProfileEdit(returnMode: ProfileMode = "index") {
    setEditReturnMode(returnMode);
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
    setProfileMode(editReturnMode);
  }

  return (
    <div className="grid gap-5 pb-28 sm:pb-32">
      {activeTab === "profile" ? null : (
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
      )}

      {activeTab === "profile" ? (
        <section className="grid gap-4">
          {profileMode === "edit" ? (
            <div id="business-profile-edit">
              <ProfileSubviewHeader
                title="Edit Profile"
                description="Keep your business and loan-use details current."
                onBack={() => setProfileMode(editReturnMode)}
              />
              <BorrowerPortfolioForm
                onCancel={() => setProfileMode(editReturnMode)}
                onSaved={handlePortfolioSaved}
              />
            </div>
          ) : (
            <BorrowerProfileHub
              accountEmail={accountEmail}
              activeView={profileMode}
              creditSummary={creditSummary}
              loadState={portfolioLoadState}
              message={portfolioMessage}
              onEditProfile={openProfileEdit}
              onNavigateHome={() => changeTab("home")}
              onProfileViewChange={setProfileMode}
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
  activeView,
  creditSummary,
  loadState,
  message,
  onEditProfile,
  onNavigateHome,
  onProfileViewChange,
  portfolio,
  readiness,
  result,
}: {
  accountEmail: string;
  activeView: ProfileMode;
  creditSummary: BorrowerCreditSummary | null;
  loadState: PortfolioLoadState;
  message: string;
  onEditProfile: (returnMode?: ProfileMode) => void;
  onNavigateHome: () => void;
  onProfileViewChange: (view: ProfileMode) => void;
  portfolio: BorrowerPortfolioInput | null;
  readiness: BorrowerReadinessResult | null;
  result: LoanApplicationsLoadResult | null;
}) {
  const verification = result?.borrowerVerification ?? null;
  const profileStatus = getProfileStatus(
    loadState,
    portfolio,
    readiness,
    verification?.status ?? null,
  );
  const verificationLabel =
    verification && verification.status !== "missing"
      ? borrowerVerificationStatusLabels[verification.status]
      : "Not started";
  const displayName =
    portfolio?.businessName.trim() || accountEmail || "Borrower profile";

  if (activeView === "business") {
    return (
      <ProfileSubview title="Business Profile" onBack={() => onProfileViewChange("index")}>
        <ProfileDetailCard
          actionLabel={portfolio ? "Edit" : "Add details"}
          onAction={() => onEditProfile("business")}
        >
          <ProfileSummaryRow
            label="Business name"
            value={portfolio?.businessName || "Not provided"}
          />
          <ProfileSummaryRow
            label="Business type"
            value={
              portfolio ? businessTypeLabels[portfolio.businessType] : "Not provided"
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
          <ProfileSummaryRow
            label="Loan use"
            value={portfolio?.loanPurposeContext || "Not provided"}
          />
        </ProfileDetailCard>
      </ProfileSubview>
    );
  }

  if (activeView === "financial") {
    return (
      <ProfileSubview title="Financials" onBack={() => onProfileViewChange("index")}>
        <ProfileDetailCard
          actionLabel={portfolio ? "Edit" : "Add details"}
          onAction={() => onEditProfile("financial")}
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
          <ProfileSummaryRow
            label="Profile readiness"
            value={readiness ? formatReadinessStatus(readiness.readinessStatus) : "Not available"}
          />
        </ProfileDetailCard>
        {readiness?.nextActions.length ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
            {readiness.nextActions[0]}
          </p>
        ) : null}
      </ProfileSubview>
    );
  }

  if (activeView === "borrowingPower") {
    return (
      <ProfileSubview title="Borrowing Power" onBack={() => onProfileViewChange("index")}>
        <BorrowingPowerDetail
          creditSummary={creditSummary}
          onUpdateProfile={() => onEditProfile("borrowingPower")}
          portfolio={portfolio}
          readiness={readiness}
        />
      </ProfileSubview>
    );
  }

  if (activeView === "verification") {
    return (
      <ProfileSubview title="Verification" onBack={() => onProfileViewChange("index")}>
        <BorrowerVerificationDocumentsPanel
          verification={result?.borrowerVerification ?? null}
          consentStatus={result?.consentStatuses?.borrowerDocumentUpload ?? null}
        />
      </ProfileSubview>
    );
  }

  if (activeView === "account") {
    return (
      <ProfileSubview title="Account & Security" onBack={() => onProfileViewChange("index")}>
        <AccountSection email={accountEmail} />
      </ProfileSubview>
    );
  }

  if (activeView === "support") {
    return (
      <ProfileSubview title="Help & Support" onBack={() => onProfileViewChange("index")}>
        <section className="grid gap-3 rounded-3xl bg-white px-5 py-5 shadow-sm">
          <h3 className="text-base font-semibold">Support</h3>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            For questions about your borrower profile, verification, or loan
            applications, contact LendFolio support through your registered
            account email.
          </p>
        </section>
      </ProfileSubview>
    );
  }

  return (
    <div className="grid gap-5">
      <ProfileIndexHeader
        email={accountEmail}
        displayName={displayName}
        onBack={onNavigateHome}
        onEditProfile={() => onEditProfile("index")}
      />

      {loadState === "loading" ? (
        <ProfileHubSkeleton />
      ) : loadState === "error" ? (
        <section
          className="rounded-3xl bg-white px-5 py-5 text-sm leading-6 text-[var(--muted-foreground)] shadow-sm"
          role="alert"
        >
          {message || "Could not load your profile."}
        </section>
      ) : (
        <>
          <ProfileStatusBanner
            status={profileStatus}
            onAction={() => {
              if (profileStatus.action === "verification") {
                onProfileViewChange("verification");
                return;
              }

              onEditProfile("index");
            }}
          />

          <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <ProfileMenuRow
              icon="briefcase"
              label="Business Profile"
              subtitle={portfolio?.businessName || "Business basics and loan use"}
              onClick={() => onProfileViewChange("business")}
            />
            <ProfileMenuRow
              icon="chart"
              label="Financials"
              subtitle="Revenue, expenses, and monthly payments"
              onClick={() => onProfileViewChange("financial")}
            />
            <ProfileMenuRow
              icon="wallet"
              label="Borrowing Power"
              subtitle={
                creditSummary
                  ? `${formatCreditAmount(creditSummary.availableCredit)} available`
                  : "Amount available to request"
              }
              onClick={() => onProfileViewChange("borrowingPower")}
            />
            <ProfileMenuRow
              icon="shield"
              label="Verification"
              subtitle={verificationLabel}
              onClick={() => onProfileViewChange("verification")}
            />
            <ProfileMenuRow
              icon="lock"
              label="Account"
              subtitle={accountEmail || "Signed in"}
              onClick={() => onProfileViewChange("account")}
            />
            <ProfileMenuRow
              icon="help"
              label="Help & Support"
              subtitle="Borrower account questions"
              onClick={() => onProfileViewChange("support")}
            />
          </section>

          <form action={signOutAction} className="pt-1">
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            >
              <ProfileIcon name="logout" className="size-4" />
              Log out
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function ProfileIndexHeader({
  displayName,
  email,
  onBack,
  onEditProfile,
}: {
  displayName: string;
  email: string;
  onBack: () => void;
  onEditProfile: () => void;
}) {
  return (
    <section className="grid gap-4 bg-[var(--background)]">
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
        <button
          type="button"
          aria-label="Back to Home"
          onClick={onBack}
          className="inline-flex size-10 items-center justify-center rounded-full bg-white text-[var(--foreground)] shadow-sm transition hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          <ProfileIcon name="back" className="size-5" />
        </button>
        <h2 className="text-center text-lg font-semibold">Profile</h2>
      </div>

      <div className="grid justify-items-center gap-2 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-white text-xl font-semibold text-[var(--foreground)] shadow-sm">
          {getInitials(displayName)}
        </div>
        <div className="grid max-w-full gap-1">
          <h3 className="max-w-full truncate text-lg font-semibold">
            {displayName}
          </h3>
          <p className="max-w-full truncate text-sm text-[var(--muted-foreground)]">
            {email || "Signed in"}
          </p>
        </div>
        <button
          type="button"
          onClick={onEditProfile}
          className="mt-0.5 inline-flex h-11 min-w-40 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#171717] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
        >
          Edit Profile
        </button>
      </div>
    </section>
  );
}

function ProfileSubview({
  children,
  onBack,
  title,
}: {
  children: ReactNode;
  onBack: () => void;
  title: string;
}) {
  return (
    <section className="grid gap-4">
      <ProfileSubviewHeader title={title} onBack={onBack} />
      {children}
    </section>
  );
}

function ProfileSubviewHeader({
  description,
  onBack,
  title,
}: {
  description?: string;
  onBack: () => void;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-start">
      <button
        type="button"
        aria-label="Back to Profile"
        onClick={onBack}
        className="inline-flex size-10 items-center justify-center rounded-full bg-white text-[var(--foreground)] shadow-sm transition hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      >
        <ProfileIcon name="back" className="size-5" />
      </button>
      <div className="grid gap-1 text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm leading-5 text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProfileDetailCard({
  actionLabel,
  children,
  onAction,
}: {
  actionLabel: string;
  children: ReactNode;
  onAction: () => void;
}) {
  return (
    <section className="grid gap-3 rounded-3xl bg-white px-5 py-5 shadow-sm">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-10 items-center gap-1 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          {actionLabel}
          <ProfileIcon name="chevron" className="size-4" />
        </button>
      </div>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function ProfileMenuRow({
  icon,
  label,
  onClick,
  submit = false,
  subtitle,
}: {
  icon: ProfileIconName;
  label: string;
  onClick?: () => void;
  submit?: boolean;
  subtitle?: string;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      className="grid min-h-14 w-full grid-cols-[2.25rem_1fr_1.25rem] items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 text-left last:border-b-0 transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--primary)]"
    >
      <span className="grid size-9 place-items-center rounded-full bg-[var(--background)] text-[var(--foreground)]">
        <ProfileIcon name={icon} className="size-5" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-sm font-semibold leading-5 text-[var(--foreground)]">
          {label}
        </span>
        {subtitle ? (
          <span className="truncate text-xs leading-4 text-[var(--muted-foreground)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {submit ? null : (
        <ProfileIcon
          name="chevron"
          className="size-5 justify-self-end text-[var(--muted-foreground)]"
        />
      )}
    </button>
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

type ProfileIconName =
  | "back"
  | "alert"
  | "briefcase"
  | "chart"
  | "check"
  | "chevron"
  | "help"
  | "lock"
  | "logout"
  | "shield"
  | "wallet";

function ProfileIcon({
  className,
  name,
}: {
  className: string;
  name: ProfileIconName;
}) {
  const paths: Record<ProfileIconName, ReactNode> = {
    back: <path d="m15 18-6-6 6-6" />,
    alert: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 4.6 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    briefcase: (
      <>
        <path d="M10 6h4" />
        <path d="M9 6a3 3 0 0 1 6 0" />
        <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M4 13h16" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-3" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 4.5-6" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.8 2.8 0 1 1 4.8 2c-.9.8-1.3 1.2-1.3 2.3" />
        <path d="M12 17h.01" />
      </>
    ),
    lock: (
      <>
        <rect width="14" height="10" x="5" y="11" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17 15 12 10 7" />
        <path d="M15 12H3" />
        <path d="M21 19V5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7h16v12H4z" />
        <path d="M4 10h16" />
        <path d="M16 15h.01" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {paths[name]}
    </svg>
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

function ProfileStatusBanner({
  onAction,
  status,
}: {
  onAction: () => void;
  status: ReturnType<typeof getProfileStatus>;
}) {
  const iconName: ProfileIconName =
    status.tone === "ready" ? "check" : status.tone === "attention" ? "alert" : "shield";
  const iconClassName =
    status.tone === "ready"
      ? "bg-emerald-50 text-emerald-700"
      : status.tone === "attention"
        ? "bg-amber-50 text-amber-800"
        : "bg-[var(--muted)] text-[var(--muted-foreground)]";

  return (
    <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid min-w-0 grid-cols-[2.25rem_1fr] gap-3">
        <span
          className={`mt-0.5 grid size-9 place-items-center rounded-full ${iconClassName}`}
        >
          <ProfileIcon name={iconName} className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            <p className="text-sm font-semibold leading-5 text-[var(--foreground)]">
              {status.title}
            </p>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            {status.description}
          </p>
        </div>
      </div>
      {status.actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="ml-12 inline-flex h-10 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:ml-0"
        >
          {status.actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function BorrowingPowerDetail({
  creditSummary,
  onUpdateProfile,
  portfolio,
  readiness,
}: {
  creditSummary: BorrowerCreditSummary | null;
  onUpdateProfile: () => void;
  portfolio: BorrowerPortfolioInput | null;
  readiness: BorrowerReadinessResult | null;
}) {
  return (
    <section className="grid gap-4 rounded-3xl bg-white px-5 py-5 shadow-sm">
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
          Available to request
        </p>
        <p className="text-3xl font-semibold tabular-nums">
          {creditSummary
            ? formatCreditAmount(creditSummary.availableCredit)
            : "Not available"}
        </p>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Based on your saved financials and any active loan balance.
        </p>
      </div>

      <div className="grid gap-2">
        <ProfileSummaryRow
          label="Used credit"
          value={
            creditSummary
              ? formatCreditAmount(creditSummary.usedCredit)
              : "Not available"
          }
        />
        <ProfileSummaryRow
          label="Max eligible amount"
          value={
            creditSummary
              ? formatCreditAmount(creditSummary.calculatedCreditLimit)
              : "Not available"
          }
        />
        <ProfileSummaryRow
          label="Monthly revenue"
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
          label="Existing loan payments"
          value={
            portfolio
              ? formatCreditAmount(portfolio.existingLoanPayments)
              : "Not provided"
          }
        />
        <ProfileSummaryRow
          label="Net monthly cash flow"
          value={
            creditSummary
              ? formatCreditAmount(creditSummary.monthlyNetCashFlow)
              : readiness
                ? formatCreditAmount(readiness.monthlyNetCashFlow)
                : "Not available"
          }
        />
        <ProfileSummaryRow
          label="Readiness"
          value={
            readiness
              ? formatReadinessStatus(readiness.readinessStatus)
              : "Not available"
          }
        />
      </div>

      <p className="rounded-2xl bg-[var(--muted)]/40 px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
        LendFolio estimates borrowing power from net monthly cash flow, time in
        operation, revenue limits, and existing active loans. Updating your
        profile refreshes this amount.
      </p>

      <button
        type="button"
        onClick={onUpdateProfile}
        className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
      >
        Update profile details
      </button>
    </section>
  );
}

function ProfileHubSkeleton() {
  return (
    <section
      className="grid gap-3 rounded-3xl bg-white px-5 py-5 shadow-sm"
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
  verificationStatus: string | null = null,
) {
  if (loadState === "loading") {
    return {
      tone: "neutral" as const,
      label: "Loading",
      title: "Loading profile",
      description: "Checking your saved business details.",
      action: null,
      actionLabel: null,
    };
  }

  if (loadState === "error") {
    return {
      tone: "attention" as const,
      label: "Profile needs review",
      title: "Profile unavailable",
      description: "Your profile could not be loaded right now.",
      action: "edit" as const,
      actionLabel: "Update profile details",
    };
  }

  if (!portfolio || loadState === "empty") {
    return {
      tone: "attention" as const,
      label: "Profile needs review",
      title: "Complete your borrower profile",
      description: "Add the essential business details lenders need first.",
      action: "edit" as const,
      actionLabel: "Update profile details",
    };
  }

  if (
    readiness?.readinessStatus === "needs_review" ||
    readiness?.readinessStatus === "not_eligible"
  ) {
    return {
      tone: "attention" as const,
      label: "Profile needs review",
      title: "Review your profile",
      description:
        readiness.nextActions[0] ??
        "Some profile details may affect loan application readiness.",
      action: "edit" as const,
      actionLabel: "Update profile details",
    };
  }

  if (readiness?.readinessStatus === "incomplete") {
    return {
      tone: "attention" as const,
      label: "Profile needs review",
      title: "Finish your profile",
      description:
        readiness.nextActions[0] ?? "A few required details are still missing.",
      action: "edit" as const,
      actionLabel: "Update profile details",
    };
  }

  if (
    verificationStatus &&
    verificationStatus !== "missing" &&
    verificationStatus !== "approved"
  ) {
    return {
      tone: "attention" as const,
      label: "Verification required",
      title: "Complete verification",
      description: "Verification approval is required before applying.",
      action: "verification" as const,
      actionLabel: "Review profile",
    };
  }

  return {
    tone: "ready" as const,
    label: "Ready to apply",
    title: "Business profile is ready",
    description: "Your profile details can support a loan application.",
    action: null,
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

function formatReadinessStatus(value: BorrowerReadinessResult["readinessStatus"]) {
  return value
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "B";
}

function AccountSection({ email }: { email: string }) {
  return (
    <section className="grid gap-3 rounded-3xl bg-white px-5 py-4 shadow-sm">
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

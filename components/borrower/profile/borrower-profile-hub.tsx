import { AlertCircle, Briefcase, ChartColumn, HelpCircle, Lock, ShieldCheck, Wallet } from "lucide-react";
import { BorrowerVerificationDocumentsPanel } from "@/components/borrower-verification-documents-panel";
import { ProfileSubview } from "./profile-subview";
import { ProfileIndexHeader } from "./profile-index-header";
import { ProfileDetailCard } from "./profile-detail-card";
import { SummaryRow } from "@/components/borrower/ui/summary-row";
import { ProfileStatusBanner } from "./profile-status-banner";
import { ProfileMenuRow } from "./profile-menu-row";
import { BorrowingPowerDetail } from "./borrowing-power-detail";
import { AccountSection } from "./account-section";
import { BorrowerCard } from "@/components/borrower/ui/borrower-card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  businessTypeLabels,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import { borrowerVerificationStatusLabels } from "@/lib/borrower-verification";
import type { BorrowerReadinessResult } from "@/lib/borrower-readiness";
import {
  formatCreditAmount,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
import { type LoanApplicationsLoadResult } from "@/app/borrower/actions";

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

export function BorrowerProfileHub({
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
  const isLoadingProfile = loadState === "loading";
  const displayName =
    portfolio?.businessName.trim() || (isLoadingProfile ? "" : "Borrower profile");

  if (activeView === "business") {
    return (
      <ProfileSubview title="Business Profile" onBack={() => onProfileViewChange("index")}>
        <ProfileDetailCard
          actionLabel={portfolio ? "Edit" : "Add details"}
          onAction={() => onEditProfile("business")}
        >
          <SummaryRow
            label="Business name"
            value={portfolio?.businessName || "Not provided"}
          />
          <SummaryRow
            label="Business type"
            value={
              portfolio ? businessTypeLabels[portfolio.businessType] : "Not provided"
            }
          />
          <SummaryRow
            label="Business location"
            value={portfolio?.location || "Not provided"}
          />
          <SummaryRow
            label="Years in operation"
            value={
              portfolio
                ? formatYearsInOperation(portfolio.yearsInOperation)
                : "Not provided"
            }
          />
          <SummaryRow
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
          <SummaryRow
            label="Monthly gross revenue"
            value={
              portfolio
                ? formatCreditAmount(portfolio.monthlyGrossRevenue)
                : "Not provided"
            }
          />
          <SummaryRow
            label="Monthly expenses"
            value={
              portfolio
                ? formatCreditAmount(portfolio.monthlyExpenses)
                : "Not provided"
            }
          />
          <SummaryRow
            label="Existing monthly loan payments"
            value={
              portfolio
                ? formatCreditAmount(portfolio.existingLoanPayments)
                : "Not provided"
            }
          />
          <SummaryRow
            label="Profile readiness"
            value={readiness ? formatReadinessStatus(readiness.readinessStatus) : "Not available"}
          />
        </ProfileDetailCard>
        {readiness?.nextActions.length ? (
          <p className="rounded-xl bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
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
        <BorrowerCard>
          <div className="px-5 pt-5 pb-4">
            <h3 className="text-sm font-medium text-foreground">Support</h3>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              For questions about your borrower profile, verification, or loan
              applications, contact LendFolio support through your registered
              account email.
            </p>
          </div>
        </BorrowerCard>
      </ProfileSubview>
    );
  }

  return (
    <div className="grid gap-6">
      <ProfileIndexHeader
        email={accountEmail}
        displayName={displayName}
        isLoading={isLoadingProfile}
        onBack={onNavigateHome}
        onEditProfile={() => onEditProfile("index")}
      />

      {loadState === "loading" ? (
        <ProfileHubSkeleton />
      ) : loadState === "error" ? (
        <BorrowerCard className="border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">Error</p>
          </div>
          <p className="mt-1 text-sm text-destructive/80">
            {message || "Could not load your profile."}
          </p>
        </BorrowerCard>
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

          <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10 divide-y divide-border/50">
            <ProfileMenuRow
              icon={Briefcase}
              label="Business Profile"
              subtitle={portfolio?.businessName || "Business basics and loan use"}
              onClick={() => onProfileViewChange("business")}
            />
            <ProfileMenuRow
              icon={ChartColumn}
              label="Financials"
              subtitle="Revenue, expenses, and monthly payments"
              onClick={() => onProfileViewChange("financial")}
            />
            <ProfileMenuRow
              icon={Wallet}
              label="Borrowing Power"
              subtitle={
                creditSummary
                  ? `${formatCreditAmount(creditSummary.availableCredit)} available`
                  : "Amount available to request"
              }
              onClick={() => onProfileViewChange("borrowingPower")}
            />
            <ProfileMenuRow
              icon={ShieldCheck}
              label="Verification"
              subtitle={verificationLabel}
              onClick={() => onProfileViewChange("verification")}
            />
            <ProfileMenuRow
              icon={Lock}
              label="Account"
              subtitle={accountEmail || "Signed in"}
              onClick={() => onProfileViewChange("account")}
            />
            <ProfileMenuRow
              icon={HelpCircle}
              label="Help & Support"
              subtitle="Borrower account questions"
              onClick={() => onProfileViewChange("support")}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ProfileHubSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10 divide-y divide-border/50">
        <Skeleton className="h-14 w-full rounded-none" />
        <Skeleton className="h-14 w-full rounded-none" />
        <Skeleton className="h-14 w-full rounded-none" />
        <Skeleton className="h-14 w-full rounded-none" />
        <Skeleton className="h-14 w-full rounded-none" />
        <Skeleton className="h-14 w-full rounded-none" />
      </div>
    </div>
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
    const needsResubmission =
      verificationStatus === "rejected" ||
      verificationStatus === "needs_resubmission";

    return {
      tone: "attention" as const,
      label: needsResubmission ? "Resubmission needed" : "Verification required",
      title: needsResubmission
        ? "Update your verification documents"
        : "Complete borrower verification",
      description: needsResubmission
        ? "Review the feedback and upload replacement documents."
        : "Upload a valid ID and business proof to verify your borrower profile.",
      action: "verification" as const,
      actionLabel: "Go to verification",
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

function formatReadinessStatus(value: string) {
  return value
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

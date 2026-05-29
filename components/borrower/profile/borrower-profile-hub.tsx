import { AlertCircle, Briefcase, ChartColumn, HelpCircle, Lock, LogOut, ShieldCheck, Wallet } from "lucide-react";
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
import { Button } from "@/components/ui/button";

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
import { signOutAction } from "@/app/login/actions";

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
  const displayName =
    portfolio?.businessName.trim() || "Borrower profile";

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
          <h3 className="text-sm font-medium text-foreground">Support</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            For questions about your borrower profile, verification, or loan
            applications, contact LendFolio support through your registered
            account email.
          </p>
        </BorrowerCard>
      </ProfileSubview>
    );
  }

  return (
    <div className="grid gap-6">
      <ProfileIndexHeader
        email={accountEmail}
        displayName={displayName}
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

          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full gap-2 text-sm font-normal text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

function ProfileHubSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10 p-1">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="mt-1 h-14 w-full rounded-2xl" />
        <Skeleton className="mt-1 h-14 w-full rounded-2xl" />
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

function formatReadinessStatus(value: string) {
  return value
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

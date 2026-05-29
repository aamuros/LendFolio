import { AlertCircle, Briefcase, ChartColumn, HelpCircle, Lock, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { BorrowerVerificationDocumentsPanel } from "@/components/borrower-verification-documents-panel";
import { ProfileSubview } from "./profile-subview";
import { ProfileIndexHeader } from "./profile-index-header";
import { ProfileDetailCard } from "./profile-detail-card";
import { ProfileSummaryRow } from "./profile-summary-row";
import { ProfileStatusBanner } from "./profile-status-banner";
import { ProfileMenuRow } from "./profile-menu-row";
import { BorrowingPowerDetail } from "./borrowing-power-detail";
import { AccountSection } from "./account-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
          <p className="rounded-2xl bg-card px-4 py-3 text-sm leading-6 text-muted-foreground border border-border shadow-sm">
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
        <Card className="rounded-2xl shadow-sm border-border bg-card">
          <CardContent className="grid gap-3 p-5">
            <h3 className="text-base font-semibold">Support</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              For questions about your borrower profile, verification, or loan
              applications, contact LendFolio support through your registered
              account email.
            </p>
          </CardContent>
        </Card>
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {message || "Could not load your profile."}
          </AlertDescription>
        </Alert>
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

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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

          <form action={signOutAction} className="pt-1">
            <Button
              type="submit"
              variant="outline"
              className="w-full rounded-full h-11 gap-2 font-semibold shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-muted-foreground"
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
    <Card
      className="rounded-2xl shadow-sm border-border bg-card"
      aria-busy="true"
      aria-label="Loading profile summary"
    >
      <CardContent className="grid gap-3 p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
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

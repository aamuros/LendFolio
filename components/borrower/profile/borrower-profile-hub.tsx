import { AlertCircle, Briefcase, ChartColumn, CheckCircle2, HelpCircle, Info, Lock, ShieldCheck, Wallet } from "lucide-react";
import { BorrowerVerificationDocumentsPanel } from "@/components/borrower-verification-documents-panel";
import { ProfileSubview } from "./profile-subview";
import { ProfileDetailCard } from "./profile-detail-card";
import { SummaryRow } from "@/components/borrower/ui/summary-row";
import { ProfileStatusBanner } from "./profile-status-banner";
import { BorrowingPowerDetail } from "./borrowing-power-detail";
import { AccountSection } from "./account-section";
import { BorrowerCard } from "@/components/borrower/ui/borrower-card";
import { ProfileIndexHeader } from "@/components/profile/profile-index-header";
import { ProfileMenuRow } from "@/components/profile/profile-menu-row";
import { ProfileSignOutRow } from "@/components/profile/profile-sign-out-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  borrowerRoleLabels,
  businessTypeLabels,
  operatingModelLabels,
  ownershipTypeLabels,
  primarySalesChannelLabels,
  revenueConfidenceLabels,
  revenuePeriodLabels,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import {
  borrowerVerificationStatusLabels,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
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
  postSaveVerification = false,
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
  postSaveVerification?: boolean;
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
    portfolio?.businessName?.trim() ||
    (isLoadingProfile ? "" : "Borrower profile");

  if (activeView === "business") {
    const businessHeaderSubtitle = portfolio
      ? [
          businessTypeLabels[portfolio.businessType],
          portfolio.location,
          formatYearsInOperation(portfolio.yearsInOperation),
        ]
          .filter(Boolean)
          .join(" · ")
      : undefined;

    return (
      <ProfileSubview title="Business Profile" onBack={() => onProfileViewChange("index")}>
        <ProfileDetailCard
          actionLabel={portfolio ? "Edit" : "Add details"}
          headerLabel="Business profile"
          headerTitle={portfolio?.businessName || undefined}
          headerSubtitle={businessHeaderSubtitle}
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
            label="Ownership type"
            value={
              portfolio
                ? ownershipTypeLabels[portfolio.ownershipType]
                : "Not provided"
            }
          />
          <SummaryRow
            label="Role"
            value={
              portfolio
                ? borrowerRoleLabels[portfolio.borrowerRole]
                : "Not provided"
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
            label="Operating model"
            value={
              portfolio
                ? operatingModelLabels[portfolio.operatingModel]
                : "Not provided"
            }
          />
          <SummaryRow
            label="Sales channel"
            value={
              portfolio
                ? primarySalesChannelLabels[portfolio.primarySalesChannel]
                : "Not provided"
            }
          />
          <SummaryRow
            label="Products or services"
            value={portfolio?.mainProductsOrServices || "Not provided"}
          />
          <SummaryRow
            label="Suppliers"
            value={portfolio?.mainSuppliers || "Not provided"}
          />
          <SummaryRow
            label="Sales records"
            value={portfolio ? yesNo(portfolio.keepsSalesRecords) : "Not provided"}
          />
          <SummaryRow
            label="Bank or e-wallet"
            value={portfolio ? yesNo(portfolio.usesBankOrEwallet) : "Not provided"}
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
    const financialHeaderTitle = portfolio
      ? formatCreditAmount(portfolio.monthlyGrossRevenue)
      : undefined;
    const financialHeaderSubtitle = portfolio
      ? [
          `${formatCreditAmount(portfolio.monthlyExpenses)} expenses`,
          readiness ? formatReadinessStatus(readiness.readinessStatus) : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : undefined;

    return (
      <ProfileSubview title="Financials" onBack={() => onProfileViewChange("index")}>
        <ProfileDetailCard
          actionLabel={portfolio ? "Edit" : "Add details"}
          headerLabel="Financial summary"
          headerTitle={financialHeaderTitle}
          headerSubtitle={financialHeaderSubtitle}
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
            label="Average daily sales"
            value={
              portfolio
                ? formatCreditAmount(portfolio.averageDailySales)
                : "Not provided"
            }
          />
          <SummaryRow
            label="Average weekly sales"
            value={
              portfolio
                ? formatCreditAmount(portfolio.averageWeeklySales)
                : "Not provided"
            }
          />
          <SummaryRow
            label="Revenue period"
            value={
              portfolio
                ? revenuePeriodLabels[portfolio.revenuePeriod]
                : "Not provided"
            }
          />
          <SummaryRow
            label="Revenue basis"
            value={
              portfolio
                ? revenueConfidenceLabels[portfolio.revenueConfidence]
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
          readinessStatus={readiness?.readinessStatus ?? null}
          onClose={() => onProfileViewChange("index")}
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
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Help & Support
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
              Contact support
            </p>
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
        fallbackInitial="B"
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
          {profileStatus.tone !== "ready" ? (
            <ProfileStatusBanner
              status={profileStatus}
              onAction={() => {
                onEditProfile("index");
              }}
            />
          ) : null}

          {verification?.status !== "approved" ? (
            <div className="flex items-start gap-3 rounded-2xl bg-muted/40 px-5 py-4">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Loan applications unlock after verification approval.
              </p>
            </div>
          ) : null}

          {postSaveVerification ? (
            <div className="flex items-start gap-3 rounded-2xl bg-muted/40 px-5 py-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-sm font-medium text-foreground">
                  Profile saved. Next, upload your verification documents.
                </p>
                <Button
                  size="sm"
                  onClick={() => onProfileViewChange("verification")}
                  className="w-fit rounded-full font-semibold"
                >
                  Continue verification
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-sm divide-y divide-border/50">
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
              icon={ShieldCheck}
              label="Verification"
              subtitle={verificationLabel}
              onClick={() => onProfileViewChange("verification")}
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
          <ProfileSignOutRow />
        </>
      )}
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function ProfileHubSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.25rem] w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}

function getProfileStatus(
  loadState: PortfolioLoadState,
  portfolio: BorrowerPortfolioInput | null,
  readiness: BorrowerReadinessResult | null,
  verificationStatus: BorrowerVerificationSummary["status"] | null,
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
    const hasVagueLoanPurpose =
      readiness.riskFlags.includes("vague_loan_purpose");

    return {
      tone: "attention" as const,
      label: hasVagueLoanPurpose ? "Update needed" : "Profile needs update",
      title: hasVagueLoanPurpose
        ? "Add more detail to your loan purpose"
        : "Review your profile",
      description: hasVagueLoanPurpose
        ? "Add more detail to your loan purpose before applying."
        : readiness.nextActions[0] ??
          "Some profile details may affect loan application readiness.",
      action: "edit" as const,
      actionLabel: hasVagueLoanPurpose
        ? "Edit loan purpose"
        : "Update profile details",
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

  if (verificationStatus !== "approved") {
    return {
      tone: "attention" as const,
      label: "Verification needed",
      title: "Verification required",
      description: "Your profile is complete, but loan applications unlock after verification approval.",
      action: null,
      actionLabel: null,
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

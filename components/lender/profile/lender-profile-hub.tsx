import {
  Building2,
  CircleDollarSign,
  Edit3Icon,
  FileCheck,
  HelpCircle,
  Lock,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { LenderProfileSubview } from "./lender-profile-subview";
import { LenderProfileIndexHeader } from "./lender-profile-index-header";
import { LenderProfileDetailCard } from "./lender-profile-detail-card";
import { SummaryRow } from "@/components/borrower/ui/summary-row";
import { LenderProfileStatusBanner } from "./lender-profile-status-banner";
import { LenderProfileMenuRow } from "./lender-profile-menu-row";
import { LenderAccountSection } from "./lender-account-section";
import { LenderVerificationDocumentsPanel } from "@/components/lender-verification-documents-panel";
import { LenderProfileChangeRequestForm } from "@/components/lender-profile-change-request-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/login/actions";

import Link from "next/link";

export type LenderProfileView =
  | "index"
  | "organization"
  | "lending"
  | "verification"
  | "documents"
  | "change-requests"
  | "account"
  | "support";

type LenderProfileData = {
  id: string | null;
  organization_name: string | null;
  contact_person: string | null;
  phone_number: string | null;
  business_address: string | null;
  operating_area: string | null;
  business_registration_number: string | null;
  min_loan_amount: number | null;
  max_loan_amount: number | null;
  typical_repayment_terms: string | null;
  lender_description: string | null;
  verification_status: string;
  approved_at: string | null;
  approved_by: string | null;
  manager_review_notes: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  documents?: Array<{
    id: string;
    lenderProfileId: string;
    documentType: string;
    status: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    reviewedAt: string | null;
    reviewNotes: string | null;
    viewUrl: string | null;
  }>;
  documentPolicy?: {
    requiredDocumentTypes: string[];
    missingRequiredDocumentTypes: string[];
    submittedDocumentTypes: string[];
    acceptedDocumentTypes: string[];
    rejectedDocumentTypes: string[];
    readyForManagerReview: boolean;
    documentsAccepted: boolean;
  };
  changeRequests?: Array<{
    id: string;
    proposedOrganizationName: string | null;
    proposedContactPerson: string | null;
    proposedBusinessAddress: string | null;
    proposedOperatingArea: string | null;
    proposedBusinessRegistrationNumber: string | null;
    proposedMinLoanAmount: number | null;
    proposedMaxLoanAmount: number | null;
    proposedTypicalRepaymentTerms: string | null;
    proposedLenderDescription: string | null;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    managerReviewNotes: string | null;
    rejectionReason: string | null;
  }>;
} | null;

export function LenderProfileHub({
  accountEmail,
  activeView,
  lenderProfile,
  onNavigateHome,
  onViewChange,
}: {
  accountEmail: string;
  activeView: LenderProfileView;
  lenderProfile: LenderProfileData;
  onNavigateHome: () => void;
  onViewChange: (view: LenderProfileView) => void;
}) {
  const verificationStatus = lenderProfile?.verification_status ?? "incomplete";
  const displayName =
    lenderProfile?.organization_name?.trim() || "Lender profile";
  const verificationLabel = formatVerificationStatus(verificationStatus);

  if (activeView === "organization") {
    return (
      <LenderProfileSubview
        title="Organization Profile"
        onBack={() => onViewChange("index")}
      >
        <LenderProfileDetailCard>
          <SummaryRow
            label="Organization name"
            value={formatOptional(lenderProfile?.organization_name ?? null)}
          />
          <SummaryRow
            label="Contact person"
            value={formatOptional(lenderProfile?.contact_person ?? null)}
          />
          <SummaryRow
            label="Phone number"
            value={formatOptional(lenderProfile?.phone_number ?? null)}
          />
          <SummaryRow
            label="Business address"
            value={formatOptional(lenderProfile?.business_address ?? null)}
          />
          <SummaryRow
            label="Operating area"
            value={formatOptional(lenderProfile?.operating_area ?? null)}
          />
          <SummaryRow
            label="Business registration"
            value={formatOptional(
              lenderProfile?.business_registration_number ?? null,
            )}
          />
        </LenderProfileDetailCard>
      </LenderProfileSubview>
    );
  }

  if (activeView === "lending") {
    return (
      <LenderProfileSubview
        title="Lending Details"
        onBack={() => onViewChange("index")}
      >
        <LenderProfileDetailCard>
          <SummaryRow
            label="Minimum loan amount"
            value={formatMoney(lenderProfile?.min_loan_amount ?? null)}
          />
          <SummaryRow
            label="Maximum loan amount"
            value={formatMoney(lenderProfile?.max_loan_amount ?? null)}
          />
          <SummaryRow
            label="Typical repayment terms"
            value={formatOptional(
              lenderProfile?.typical_repayment_terms ?? null,
            )}
          />
          <SummaryRow
            label="Lender description"
            value={formatOptional(lenderProfile?.lender_description ?? null)}
          />
        </LenderProfileDetailCard>
      </LenderProfileSubview>
    );
  }

  if (activeView === "verification") {
    return (
      <LenderProfileSubview
        title="Verification"
        onBack={() => onViewChange("index")}
      >
        <LenderVerificationDetail
          status={verificationStatus}
          approvedAt={lenderProfile?.approved_at ?? null}
          rejectedAt={lenderProfile?.rejected_at ?? null}
          rejectionReason={lenderProfile?.rejection_reason ?? null}
          managerReviewNotes={lenderProfile?.manager_review_notes ?? null}
          createdAt={lenderProfile?.created_at ?? null}
          updatedAt={lenderProfile?.updated_at ?? null}
        />
      </LenderProfileSubview>
    );
  }

  if (activeView === "documents") {
    const documents = (lenderProfile?.documents ?? []) as NonNullable<LenderProfileData>["documents"];
    const documentPolicy = lenderProfile?.documentPolicy;

    return (
      <LenderProfileSubview
        title="Verification Documents"
        onBack={() => onViewChange("index")}
      >
        {lenderProfile?.id && documentPolicy ? (
          <LenderVerificationDocumentsPanel
            lenderProfileId={lenderProfile.id}
            verificationStatus={verificationStatus}
            documents={(documents ?? []) as Parameters<typeof LenderVerificationDocumentsPanel>[0]["documents"]}
            documentPolicy={documentPolicy as Parameters<typeof LenderVerificationDocumentsPanel>[0]["documentPolicy"]}
            rejectionReason={lenderProfile?.rejection_reason ?? null}
            managerReviewNotes={lenderProfile?.manager_review_notes ?? null}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Lender profile is required before uploading documents.
          </p>
        )}
      </LenderProfileSubview>
    );
  }

  if (activeView === "change-requests") {
    return (
      <LenderProfileSubview
        title="Profile Changes"
        onBack={() => onViewChange("index")}
      >
        {verificationStatus === "approved" && lenderProfile?.id ? (
          <LenderProfileChangeRequestForm
            lenderProfileId={lenderProfile.id}
            currentProfile={{
              organization_name: lenderProfile.organization_name,
              contact_person: lenderProfile.contact_person,
              business_address: lenderProfile.business_address,
              operating_area: lenderProfile.operating_area,
              business_registration_number: lenderProfile.business_registration_number,
              min_loan_amount: lenderProfile.min_loan_amount,
              max_loan_amount: lenderProfile.max_loan_amount,
              typical_repayment_terms: lenderProfile.typical_repayment_terms,
              lender_description: lenderProfile.lender_description,
            }}
            changeRequests={(lenderProfile.changeRequests ?? []) as Parameters<typeof LenderProfileChangeRequestForm>[0]["changeRequests"]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Profile change requests are available after your lender account is approved.
          </p>
        )}
      </LenderProfileSubview>
    );
  }

  if (activeView === "account") {
    return (
      <LenderProfileSubview
        title="Account & Security"
        onBack={() => onViewChange("index")}
      >
        <LenderAccountSection email={accountEmail} />
      </LenderProfileSubview>
    );
  }

  if (activeView === "support") {
    return (
      <LenderProfileSubview
        title="Help & Support"
        onBack={() => onViewChange("index")}
      >
        <Card className="rounded-2xl">
          <div className="px-5 pt-5 pb-4">
            <h3 className="text-sm font-medium text-foreground">Support</h3>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              For questions about your lender profile, verification, or
              offer and repayment workflows, contact LendFolio support
              through your registered account email.
            </p>
          </div>
        </Card>
      </LenderProfileSubview>
    );
  }

  return (
    <div className="grid gap-6">
      <LenderProfileIndexHeader
        displayName={displayName}
        email={accountEmail}
        onBack={onNavigateHome}
      />

      {verificationStatus !== "approved" ? (
        <LenderProfileStatusBanner
          status={getVerificationBannerStatus(verificationStatus)}
          onAction={() => onViewChange("verification")}
        />
      ) : null}

      <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10 divide-y divide-border/50">
        <LenderProfileMenuRow
          icon={Building2}
          label="Organization Profile"
          subtitle={
            lenderProfile?.organization_name || "Organization details"
          }
          onClick={() => onViewChange("organization")}
        />
        <LenderProfileMenuRow
          icon={CircleDollarSign}
          label="Lending Details"
          subtitle={formatLendingSubtitle(lenderProfile)}
          onClick={() => onViewChange("lending")}
        />
        <LenderProfileMenuRow
          icon={ShieldCheck}
          label="Verification"
          subtitle={verificationLabel}
          onClick={() => onViewChange("verification")}
        />
        <LenderProfileMenuRow
          icon={FileCheck}
          label="Verification Documents"
          subtitle={
            lenderProfile?.documentPolicy?.documentsAccepted
              ? "All required documents accepted"
              : lenderProfile?.documentPolicy
                ? `${lenderProfile.documentPolicy.acceptedDocumentTypes.length}/${lenderProfile.documentPolicy.requiredDocumentTypes.length} accepted`
                : "Documents needed"
          }
          onClick={() => onViewChange("documents")}
        />
        {verificationStatus === "approved" ? (
          <LenderProfileMenuRow
            icon={Edit3Icon}
            label="Profile Changes"
            subtitle={
              lenderProfile?.changeRequests?.some((r) => r.status === "pending")
                ? "Pending request"
                : "Request profile changes"
            }
            onClick={() => onViewChange("change-requests")}
          />
        ) : null}
        <LenderProfileMenuRow
          icon={Lock}
          label="Account & Security"
          subtitle={accountEmail || "Signed in"}
          onClick={() => onViewChange("account")}
        />
        <LenderProfileMenuRow
          icon={HelpCircle}
          label="Help & Support"
          subtitle="Lender account questions"
          onClick={() => onViewChange("support")}
        />
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring cursor-pointer touch-manipulation rounded-2xl bg-muted/40"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-muted-foreground/10">
            <LogOut className="size-5" />
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-sm font-medium text-foreground">Sign out</span>
            <span className="truncate text-xs text-muted-foreground">
              Sign out of this account on this device
            </span>
          </span>
        </button>
      </form>
    </div>
  );
}



function LenderVerificationDetail({
  status,
  approvedAt,
  rejectedAt,
  rejectionReason,
  managerReviewNotes,
  createdAt,
  updatedAt,
}: {
  status: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  managerReviewNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}) {
  const showResubmitAction =
    status === "rejected" || status === "incomplete";

  return (
    <div className="grid gap-6">
      <LenderProfileDetailCard>
        <SummaryRow
          label="Verification status"
          value={formatVerificationStatus(status)}
        />
        <SummaryRow
          label="Approved at"
          value={formatDate(approvedAt)}
        />
        <SummaryRow
          label="Rejected at"
          value={formatDate(rejectedAt)}
        />
        <SummaryRow
          label="Rejection reason"
          value={formatOptional(rejectionReason)}
        />
        <SummaryRow
          label="Manager review notes"
          value={formatOptional(managerReviewNotes)}
        />
        <SummaryRow
          label="Profile created"
          value={formatDate(createdAt)}
        />
        <SummaryRow
          label="Last updated"
          value={formatDate(updatedAt)}
        />
      </LenderProfileDetailCard>

      {showResubmitAction ? (
        <Button asChild className="w-full rounded-lg text-sm font-medium">
          <Link href="/lender/onboarding">
            {status === "rejected"
              ? "Update lender profile"
              : "Complete lender profile"}
          </Link>
        </Button>
      ) : status === "approved" ? (
        <p className="text-sm text-muted-foreground">
          Contact support to change approved lender details.
        </p>
      ) : null}
    </div>
  );
}

function getVerificationBannerStatus(verificationStatus: string) {
  switch (verificationStatus) {
    case "approved":
      return {
        tone: "ready" as const,
        label: "Approved",
        title: "Your lender account is approved",
        description:
          "Your organization can review applications and send offers.",
        action: null,
        actionLabel: null,
      };
    case "pending":
      return {
        tone: "attention" as const,
        label: "Pending review",
        title: "Your lender account is pending review",
        description: "A manager is reviewing your lender profile.",
        action: "verification" as const,
        actionLabel: "View details",
      };
    case "rejected":
      return {
        tone: "attention" as const,
        label: "Rejected",
        title: "Your lender access was not approved",
        description:
          "Update your lender profile and resubmit for review.",
        action: "verification" as const,
        actionLabel: "View details",
      };
    default:
      return {
        tone: "attention" as const,
        label: "Incomplete",
        title: "Complete your lender profile",
        description:
          "Complete your lender profile to request approval.",
        action: "verification" as const,
        actionLabel: "View details",
      };
  }
}

function formatVerificationStatus(status: string) {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending review";
    case "rejected":
      return "Rejected";
    case "incomplete":
      return "Incomplete";
    default:
      return status;
  }
}

function formatLendingSubtitle(
  lenderProfile: LenderProfileData,
) {
  if (!lenderProfile) {
    return "Lending terms";
  }

  const min = lenderProfile.min_loan_amount;
  const max = lenderProfile.max_loan_amount;

  if (min != null && max != null) {
    return `${formatMoney(min)} – ${formatMoney(max)}`;
  }

  if (lenderProfile.typical_repayment_terms) {
    return lenderProfile.typical_repayment_terms;
  }

  return "Lending terms";
}

function formatMoney(value: number | null) {
  if (value == null) {
    return "Not provided";
  }

  return `PHP ${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatOptional(value: string | null) {
  return value?.trim() || "Not provided";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  try {
    return new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return "Not provided";
  }
}



import {
  Building2,
  CircleDollarSign,
  Edit3Icon,
  FileCheck,
  FileText,
  HelpCircle,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { LenderProfileSubview } from "./lender-profile-subview";
import { LenderProfileDetailCard } from "./lender-profile-detail-card";
import { SummaryRow } from "@/components/borrower/ui/summary-row";
import { LenderAccountSection } from "./lender-account-section";
import { LenderVerificationDocumentsPanel } from "@/components/lender-verification-documents-panel";
import { LenderProfileChangeRequestForm } from "@/components/lender-profile-change-request-form";
import { ProfileIndexHeader } from "@/components/profile/profile-index-header";
import { ProfileMenuRow } from "@/components/profile/profile-menu-row";
import { ProfileSignOutRow } from "@/components/profile/profile-sign-out-row";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ConsentStatus } from "@/lib/consents";
import { getLenderProfileCompletion } from "@/lib/lender-profile-completion";

import Link from "next/link";

export type LenderProfileView =
  | "index"
  | "organization"
  | "lending"
  | "verification"
  | "disclosures"
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
  consentStatus,
  lenderProfile,
  onEditProfile,
  onNavigateHome,
  onViewChange,
}: {
  accountEmail: string;
  activeView: LenderProfileView;
  consentStatus?: ConsentStatus;
  lenderProfile: LenderProfileData;
  onEditProfile: () => void;
  onNavigateHome: () => void;
  onViewChange: (view: LenderProfileView) => void;
}) {
  const verificationStatus = lenderProfile?.verification_status ?? "incomplete";
  const displayName =
    lenderProfile?.organization_name?.trim() || "Lender profile";
  const verificationLabel = formatVerificationStatus(verificationStatus);
  const disclosureSummary = formatDisclosureSummary(consentStatus);
  const profileCompletion = getLenderProfileCompletion(lenderProfile);
  const needsProfileDetails = !profileCompletion.complete;

  if (activeView === "organization") {
    return (
      <LenderProfileSubview
        title="Organization Profile"
        onBack={() => onViewChange("index")}
      >
        <LenderProfileDetailCard
          headerLabel="Organization profile"
          headerTitle={lenderProfile?.organization_name || undefined}
          headerSubtitle={formatOrgSubtitle(lenderProfile)}
        >
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
        <LenderProfileDetailCard
          headerLabel="Lending details"
          headerTitle={formatLendingTitle(lenderProfile)}
          headerSubtitle={lenderProfile?.typical_repayment_terms || undefined}
        >
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

  if (activeView === "disclosures") {
    return (
      <LenderProfileSubview
        title="Required Disclosures"
        onBack={() => onViewChange("index")}
      >
        <LenderProfileDetailCard
          headerLabel="Required disclosures"
          headerTitle={disclosureSummary}
          headerSubtitle={
            consentStatus?.isCurrent
              ? "Current disclosures accepted"
              : "Review and accept remaining disclosures from Home"
          }
        >
          <SummaryRow
            label="Accepted"
            value={`${getAcceptedRequiredConsentCount(consentStatus)}`}
          />
          <SummaryRow
            label="Remaining"
            value={`${consentStatus?.missing.length ?? 0}`}
          />
          <SummaryRow
            label="Required"
            value={`${consentStatus?.required.length ?? 0}`}
          />
        </LenderProfileDetailCard>
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
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Help & Support
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
              Contact support
            </p>
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
      <ProfileIndexHeader
        displayName={displayName}
        email={accountEmail}
        fallbackInitial="L"
        onBack={onNavigateHome}
        onEditProfile={() => {
          if (verificationStatus === "approved") {
            onViewChange("change-requests");
            return;
          }

          onEditProfile();
        }}
      />

      {needsProfileDetails ? (
        <>
          <Card className="rounded-2xl border-border/80 bg-card/90 shadow-[0_18px_50px_rgba(14,26,18,0.08)]">
            <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-start sm:p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <ShieldAlert className="size-5" />
              </span>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    PROFILE NEEDS REVIEW
                  </p>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Complete your lender profile
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Add the lender details managers need before approval.
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-11 w-full rounded-full font-semibold sm:w-fit"
                  onClick={onEditProfile}
                >
                  Update lender details
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex items-start gap-3 rounded-2xl bg-muted/40 px-5 py-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Lender approval unlocks after profile review and verification approval.
            </p>
          </div>
        </>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-sm divide-y divide-border/50">
        <ProfileMenuRow
          icon={Building2}
          label="Organization Profile"
          subtitle={
            lenderProfile?.organization_name ||
            "Organization, contact, and operating area"
          }
          onClick={() => onViewChange("organization")}
        />
        <ProfileMenuRow
          icon={CircleDollarSign}
          label="Lending Details"
          subtitle={formatLendingSubtitle(lenderProfile)}
          onClick={() => onViewChange("lending")}
        />
        <ProfileMenuRow
          icon={ShieldCheck}
          label="Verification"
          subtitle={verificationLabel}
          onClick={() => onViewChange("verification")}
        />
        <ProfileMenuRow
          icon={FileText}
          label="Required Disclosures"
          subtitle={disclosureSummary}
          onClick={() => onViewChange("disclosures")}
        />
        <ProfileMenuRow
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
          <ProfileMenuRow
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
        <ProfileMenuRow
          icon={Lock}
          label="Account & Security"
          subtitle={accountEmail || "Signed in"}
          onClick={() => onViewChange("account")}
        />
        <ProfileMenuRow
          icon={HelpCircle}
          label="Help & Support"
          subtitle="Lender account questions"
          onClick={() => onViewChange("support")}
        />
      </div>
      <ProfileSignOutRow />
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
      <LenderProfileDetailCard
        headerLabel="Verification"
        headerTitle={formatVerificationStatus(status)}
        headerSubtitle={getVerificationHeaderSubtitle(status)}
      >
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
          <Link href="/lender/edit-profile/organization">
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

function formatOrgSubtitle(
  lenderProfile: LenderProfileData,
) {
  if (!lenderProfile) {
    return undefined;
  }

  const parts = [
    lenderProfile.operating_area,
    lenderProfile.contact_person,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function formatLendingTitle(
  lenderProfile: LenderProfileData,
) {
  if (!lenderProfile) {
    return undefined;
  }

  const min = lenderProfile.min_loan_amount;
  const max = lenderProfile.max_loan_amount;

  if (min != null && max != null) {
    return `${formatMoney(min)} – ${formatMoney(max)}`;
  }

  return lenderProfile.typical_repayment_terms || undefined;
}

function getVerificationHeaderSubtitle(status: string) {
  switch (status) {
    case "approved":
      return "Your lender account is active";
    case "pending":
      return "Under manager review";
    case "rejected":
      return "Update and resubmit your profile";
    default:
      return "Complete your lender profile";
  }
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

function getAcceptedRequiredConsentCount(status?: ConsentStatus) {
  if (!status) {
    return 0;
  }

  return status.required.filter((required) =>
    status.accepted.some(
      (accepted) =>
        accepted.consentType === required.consentType &&
        accepted.version === required.version,
    ),
  ).length;
}

function formatDisclosureSummary(status?: ConsentStatus) {
  if (!status) {
    return "Disclosures unavailable";
  }

  const acceptedCount = getAcceptedRequiredConsentCount(status);
  const requiredCount = status.required.length;

  if (status.isCurrent) {
    return `${acceptedCount}/${requiredCount} accepted`;
  }

  return `${status.missing.length} remaining`;
}

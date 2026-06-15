"use client";

import { useRouter } from "next/navigation";
import { LenderAccountTab } from "./lender-account-tab";
import type { LenderVerificationDocumentSummary, LenderVerificationDocumentPolicy } from "@/lib/lender-verification";
import type { ConsentStatus } from "@/lib/consents";

type LenderProfileData = {
  id?: string | null;
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
} | null;

type ChangeRequestData = {
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
};

export function LenderAccountTabWrapper({
  email,
  lenderProfile,
  documents,
  documentPolicy,
  consentStatus,
  changeRequests,
}: {
  email: string;
  lenderProfile: LenderProfileData;
  documents?: LenderVerificationDocumentSummary[];
  documentPolicy?: LenderVerificationDocumentPolicy;
  consentStatus?: ConsentStatus;
  changeRequests?: ChangeRequestData[];
}) {
  const router = useRouter();

  return (
    <LenderAccountTab
      email={email}
      consentStatus={consentStatus}
      lenderProfile={lenderProfile ? {
        ...lenderProfile,
        id: lenderProfile.id ?? null,
        documents: documents ?? [],
        documentPolicy: documentPolicy ?? {
          requiredDocumentTypes: [],
          missingRequiredDocumentTypes: [],
          submittedDocumentTypes: [],
          acceptedDocumentTypes: [],
          rejectedDocumentTypes: [],
          readyForManagerReview: false,
          documentsAccepted: false,
        },
        changeRequests: changeRequests ?? [],
      } : null}
      onEditProfile={() => router.push("/lender/edit-profile")}
      onNavigateHome={() => router.push("/lender")}
    />
  );
}

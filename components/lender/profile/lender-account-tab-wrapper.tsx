"use client";

import { useRouter } from "next/navigation";
import { LenderAccountTab } from "./lender-account-tab";

type LenderProfileData = {
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

export function LenderAccountTabWrapper({
  email,
  lenderProfile,
}: {
  email: string;
  lenderProfile: LenderProfileData;
}) {
  const router = useRouter();

  return (
    <LenderAccountTab
      email={email}
      lenderProfile={lenderProfile}
      onNavigateHome={() => router.push("/lender")}
    />
  );
}

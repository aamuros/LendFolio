export type LenderProfileCompletionSource = {
  organization_name?: string | null;
  organizationName?: string | null;
  contact_person?: string | null;
  contactPerson?: string | null;
  phone_number?: string | null;
  phoneNumber?: string | null;
  business_address?: string | null;
  businessAddress?: string | null;
  operating_area?: string | null;
  operatingArea?: string | null;
  min_loan_amount?: number | null;
  minLoanAmount?: number | null;
  max_loan_amount?: number | null;
  maxLoanAmount?: number | null;
  typical_repayment_terms?: string | null;
  typicalRepaymentTerms?: string | null;
};

export type LenderProfileCompletion = {
  complete: boolean;
  missingFields: string[];
};

export function getLenderProfileCompletion(
  profile: LenderProfileCompletionSource | null | undefined,
): LenderProfileCompletion {
  const missingFields: string[] = [];

  const organizationName =
    profile?.organization_name ?? profile?.organizationName ?? "";
  const contactPerson = profile?.contact_person ?? profile?.contactPerson ?? "";
  const phoneNumber = profile?.phone_number ?? profile?.phoneNumber ?? "";
  const businessAddress =
    profile?.business_address ?? profile?.businessAddress ?? "";
  const operatingArea = profile?.operating_area ?? profile?.operatingArea ?? "";
  const minLoanAmount =
    profile?.min_loan_amount ?? profile?.minLoanAmount ?? null;
  const maxLoanAmount =
    profile?.max_loan_amount ?? profile?.maxLoanAmount ?? null;
  const typicalRepaymentTerms =
    profile?.typical_repayment_terms ?? profile?.typicalRepaymentTerms ?? "";

  if (!organizationName.trim()) {
    missingFields.push("organization");
  }

  if (!contactPerson.trim()) {
    missingFields.push("contact person");
  }

  if (!phoneNumber.trim()) {
    missingFields.push("phone number");
  }

  if (!businessAddress.trim()) {
    missingFields.push("address");
  }

  if (!operatingArea.trim()) {
    missingFields.push("area");
  }

  if (
    minLoanAmount == null ||
    maxLoanAmount == null ||
    minLoanAmount <= 0 ||
    maxLoanAmount < minLoanAmount
  ) {
    missingFields.push("loan range");
  }

  if (!typicalRepaymentTerms.trim()) {
    missingFields.push("repayment terms");
  }

  return {
    complete: missingFields.length === 0,
    missingFields,
  };
}

export function getLenderProfileCompletionMessage(
  completion: LenderProfileCompletion,
) {
  if (completion.complete) {
    return "Profile details complete.";
  }

  return `Action needed: Complete lender details before manager review. Missing: ${completion.missingFields.join(", ")}.`;
}

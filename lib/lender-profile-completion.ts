export type LenderProfileCompletionSource = {
  contact_person?: string | null;
  contactPerson?: string | null;
  phone_number?: string | null;
  phoneNumber?: string | null;
  operating_area?: string | null;
  operatingArea?: string | null;
  min_loan_amount?: number | null;
  minLoanAmount?: number | null;
  max_loan_amount?: number | null;
  maxLoanAmount?: number | null;
};

export type LenderProfileCompletion = {
  complete: boolean;
  missingFields: string[];
};

export function getLenderProfileCompletion(
  profile: LenderProfileCompletionSource | null | undefined,
): LenderProfileCompletion {
  const missingFields: string[] = [];

  const contactPerson = profile?.contact_person ?? profile?.contactPerson ?? "";
  const phoneNumber = profile?.phone_number ?? profile?.phoneNumber ?? "";
  const operatingArea = profile?.operating_area ?? profile?.operatingArea ?? "";
  const minLoanAmount =
    profile?.min_loan_amount ?? profile?.minLoanAmount ?? null;
  const maxLoanAmount =
    profile?.max_loan_amount ?? profile?.maxLoanAmount ?? null;

  if (!contactPerson.trim() && !phoneNumber.trim()) {
    missingFields.push("contact");
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

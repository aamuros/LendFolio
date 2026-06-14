import type { Database } from "@/lib/supabase/types";

export type UserConsentType = Database["public"]["Enums"]["user_consent_type"];

export type ConsentScope =
  | "signup_baseline"
  | "borrower_document_upload"
  | "borrower_loan_application"
  | "lender_review";

export type ConsentVersionRequirement = {
  consentType: UserConsentType;
  version: string;
};

export type UserConsentRecord = {
  consentType: UserConsentType;
  version: string;
  acceptedAt: string;
};

export type ConsentStatus = {
  scope: ConsentScope;
  isCurrent: boolean;
  required: ConsentVersionRequirement[];
  missing: ConsentVersionRequirement[];
  accepted: UserConsentRecord[];
};

export const CURRENT_CONSENT_VERSIONS = {
  terms_of_service: "2026-05-terms-v1",
  privacy_notice: "2026-05-privacy-v1",
  credit_review_authorization: "2026-05-credit-review-v1",
  document_processing_consent: "2026-05-document-processing-v1",
  lender_review_consent: "2026-05-lender-review-v1",
} as const satisfies Record<UserConsentType, string>;

export const consentTypeLabels = {
  terms_of_service: "Terms of Service",
  privacy_notice: "Privacy Notice",
  credit_review_authorization: "Credit Review Authorization",
  document_processing_consent: "Document Processing Consent",
  lender_review_consent: "Authorization for Verification",
} as const satisfies Record<UserConsentType, string>;

export const consentTypeDescriptions = {
  terms_of_service: "",
  privacy_notice: "",
  credit_review_authorization: "",
  document_processing_consent: "",
  lender_review_consent: "",
} as const satisfies Record<UserConsentType, string>;

export const consentTypeDetailText = {
  terms_of_service: "",
  privacy_notice: "",
  credit_review_authorization: "",
  document_processing_consent: "",
  lender_review_consent:
    "I authorize LendFolio to review my lender profile, verify my submitted documents, and assess my eligibility to access lender features. I confirm that the information I submitted is accurate and understand that LendFolio may request additional documents before approval.",
} as const satisfies Record<UserConsentType, string>;

export const signupBaselineRequiredConsents = [
  "terms_of_service",
  "privacy_notice",
] as const satisfies UserConsentType[];

export const borrowerDocumentUploadRequiredConsents = [
  "terms_of_service",
  "privacy_notice",
  "document_processing_consent",
] as const satisfies UserConsentType[];

export const borrowerLoanApplicationRequiredConsents = [
  "terms_of_service",
  "privacy_notice",
  "credit_review_authorization",
] as const satisfies UserConsentType[];

export const lenderReviewRequiredConsents = [
  "terms_of_service",
  "privacy_notice",
  "lender_review_consent",
] as const satisfies UserConsentType[];

export function getRequiredConsentVersions(
  scope: ConsentScope,
): ConsentVersionRequirement[] {
  const requiredConsents =
    scope === "signup_baseline"
      ? signupBaselineRequiredConsents
      : scope === "borrower_document_upload"
      ? borrowerDocumentUploadRequiredConsents
      : scope === "borrower_loan_application"
        ? borrowerLoanApplicationRequiredConsents
        : lenderReviewRequiredConsents;

  return requiredConsents.map((consentType) => ({
    consentType,
    version: CURRENT_CONSENT_VERSIONS[consentType],
  }));
}

export function hasCurrentRequiredConsents(
  consents: UserConsentRecord[],
  requiredConsents: ConsentVersionRequirement[],
) {
  return requiredConsents.every((required) =>
    consents.some(
      (consent) =>
        consent.consentType === required.consentType &&
        consent.version === required.version,
    ),
  );
}

export function getMissingRequiredConsents(
  consents: UserConsentRecord[],
  requiredConsents: ConsentVersionRequirement[],
) {
  return requiredConsents.filter(
    (required) =>
      !consents.some(
        (consent) =>
          consent.consentType === required.consentType &&
          consent.version === required.version,
      ),
  );
}

export function buildConsentStatus(
  scope: ConsentScope,
  consents: UserConsentRecord[],
): ConsentStatus {
  const required = getRequiredConsentVersions(scope);

  return {
    scope,
    isCurrent: hasCurrentRequiredConsents(consents, required),
    required,
    missing: getMissingRequiredConsents(consents, required),
    accepted: consents,
  };
}

export function toConsentRpcPayload(requiredConsents: ConsentVersionRequirement[]) {
  return requiredConsents.map((consent) => ({
    consent_type: consent.consentType,
    version: consent.version,
  }));
}

export const documentAiReviewStatuses = [
  "not_run",
  "pass",
  "needs_manual_review",
  "fail",
  "error",
] as const;

export type DocumentAiReviewStatus = (typeof documentAiReviewStatuses)[number];

export const documentAiDetectedTypes = [
  "valid_id",
  "business_proof",
  "address_proof",
  "business_registration",
  "authorization_letter",
  "lending_license",
  "proof_of_address",
  "other",
  "unknown",
] as const;

export type DocumentAiDetectedType = (typeof documentAiDetectedTypes)[number];

export const documentAiReadabilityValues = [
  "clear",
  "partially_readable",
  "unreadable",
] as const;

export type DocumentAiReadability =
  (typeof documentAiReadabilityValues)[number];

export const documentAiDecisions = [
  "pass",
  "needs_manual_review",
  "fail",
] as const;

export type DocumentAiDecision = (typeof documentAiDecisions)[number];

export type DocumentAiReviewSummary = {
  aiReviewStatus: DocumentAiReviewStatus;
  aiReviewConfidence: number | null;
  aiDetectedDocumentType: DocumentAiDetectedType | null;
  aiReviewReason: string | null;
  aiRiskFlags: string[];
  aiModel: string | null;
  aiReviewedAt: string | null;
};

export function getDocumentAiUploadMessage(status: DocumentAiReviewStatus) {
  if (status === "fail") {
    return "The document was submitted, but AI flagged it as possibly mismatched. You may replace it with the correct document, or wait for manager review.";
  }

  if (status === "needs_manual_review") {
    return "The document was submitted, but it may need closer manual review.";
  }

  if (status === "pass") {
    return "The document was submitted and appears to match the selected document type. A manager will still complete the final review.";
  }

  if (status === "error") {
    return "The document was submitted for manual review. AI pre-screening was unavailable.";
  }

  return null;
}

export function isDocumentAiReviewWarning(status: DocumentAiReviewStatus) {
  return status === "fail" || status === "needs_manual_review" || status === "error";
}

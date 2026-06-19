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
    return "The uploaded file does not appear to match the selected document type. You may upload another file or submit it for manual review.";
  }

  if (status === "needs_manual_review") {
    return "The document was submitted, but it may require manual review due to quality or uncertainty.";
  }

  return null;
}

export function isDocumentAiReviewWarning(status: DocumentAiReviewStatus) {
  return status === "fail" || status === "needs_manual_review";
}

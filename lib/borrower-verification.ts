import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
type BorrowerVerificationRow =
  Database["public"]["Tables"]["borrower_verifications"]["Row"];
type BorrowerVerificationDocumentRow =
  Database["public"]["Tables"]["borrower_verification_documents"]["Row"];

export type BorrowerVerificationStatus =
  Database["public"]["Enums"]["borrower_verification_status"];

export type BorrowerVerificationSummary = {
  id: string | null;
  status: BorrowerVerificationStatus | "missing";
  managerReviewNotes: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  documents: BorrowerVerificationDocumentSummary[];
  documentPolicy: BorrowerVerificationDocumentPolicy;
};

export type BorrowerVerificationDocumentType =
  Database["public"]["Enums"]["borrower_verification_document_type"];

export type BorrowerVerificationDocumentStatus =
  Database["public"]["Enums"]["borrower_verification_document_status"];

export type BorrowerVerificationDocumentSummary = {
  id: string;
  borrowerVerificationId: string;
  documentType: BorrowerVerificationDocumentType;
  status: BorrowerVerificationDocumentStatus;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
};

export const borrowerVerificationDocumentBucket =
  "borrower-verification-documents";

export const borrowerVerificationDocumentMaxFileSize = 5 * 1024 * 1024;

export const borrowerVerificationDocumentAllowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const borrowerVerificationDocumentTypes = [
  "valid_id",
  "business_proof",
  "address_proof",
  "business_registration",
  "other",
] as const satisfies BorrowerVerificationDocumentType[];

export const requiredBorrowerVerificationDocumentTypes = [
  "valid_id",
  "business_proof",
] as const satisfies BorrowerVerificationDocumentType[];

export const borrowerVerificationDocumentTypeLabels: Record<
  BorrowerVerificationDocumentType,
  string
> = {
  valid_id: "Valid ID",
  business_proof: "Business proof",
  address_proof: "Address proof",
  business_registration: "Business registration",
  other: "Other",
};

export const borrowerVerificationDocumentStatusLabels: Record<
  BorrowerVerificationDocumentStatus,
  string
> = {
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Superseded",
};

export const borrowerVerificationStatusLabels: Record<
  BorrowerVerificationStatus,
  string
> = {
  not_started: "Not started",
  pending: "Pending documents",
  pending_documents: "Pending documents",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  needs_resubmission: "Needs resubmission",
};

export type BorrowerVerificationDocumentPolicy = {
  requiredDocumentTypes: BorrowerVerificationDocumentType[];
  missingRequiredDocumentTypes: BorrowerVerificationDocumentType[];
  submittedDocumentTypes: BorrowerVerificationDocumentType[];
  acceptedDocumentTypes: BorrowerVerificationDocumentType[];
  rejectedDocumentTypes: BorrowerVerificationDocumentType[];
  readyForManagerReview: boolean;
  documentsAccepted: boolean;
};

export function calculateBorrowerVerificationDocumentPolicy(
  documents: Pick<
    BorrowerVerificationDocumentSummary,
    "documentType" | "status"
  >[],
): BorrowerVerificationDocumentPolicy {
  const submitted = new Set<BorrowerVerificationDocumentType>();
  const accepted = new Set<BorrowerVerificationDocumentType>();
  const rejected = new Set<BorrowerVerificationDocumentType>();

  for (const document of documents) {
    if (document.status === "submitted" || document.status === "accepted") {
      submitted.add(document.documentType);
    }

    if (document.status === "accepted") {
      accepted.add(document.documentType);
    }

    if (document.status === "rejected") {
      rejected.add(document.documentType);
    }
  }

  const missingRequiredDocumentTypes =
    requiredBorrowerVerificationDocumentTypes.filter(
      (documentType) => !accepted.has(documentType),
    );

  return {
    requiredDocumentTypes: [...requiredBorrowerVerificationDocumentTypes],
    missingRequiredDocumentTypes,
    submittedDocumentTypes: [...submitted],
    acceptedDocumentTypes: [...accepted],
    rejectedDocumentTypes: [...rejected],
    readyForManagerReview: requiredBorrowerVerificationDocumentTypes.every(
      (documentType) => submitted.has(documentType),
    ),
    documentsAccepted: missingRequiredDocumentTypes.length === 0,
  };
}

export function canSubmitLoanApplicationForVerification(
  verification: BorrowerVerificationSummary | null,
) {
  return (
    verification?.status === "approved" &&
    verification.documentPolicy.documentsAccepted
  );
}

export function getBorrowerVerificationMessage(
  verification: BorrowerVerificationSummary | null,
) {
  if (!verification || verification.status === "missing") {
    return "Borrower verification is required before submitting a loan application.";
  }

  if (verification.status === "approved") {
    return verification.documentPolicy.documentsAccepted
      ? "Borrower verification approved."
      : "Required verification documents must be accepted before applying.";
  }

  if (
    verification.status === "rejected" ||
    verification.status === "needs_resubmission"
  ) {
    return "Your borrower verification needs updates before applying.";
  }

  if (!verification.documentPolicy.readyForManagerReview) {
    return "Upload the required verification documents before manager review.";
  }

  return "Your borrower verification is waiting for manager review.";
}

export async function getBorrowerVerificationStatus(
  supabase: SupabaseServerClient,
  borrowerId: string,
): Promise<BorrowerVerificationSummary> {
  const { data, error } = await supabase
    .from("borrower_verifications")
    .select(
      "id, borrower_id, verification_status, submitted_at, reviewed_at, reviewed_by, manager_review_notes, rejection_reason, created_at, updated_at",
    )
    .eq("borrower_id", borrowerId)
    .maybeSingle<BorrowerVerificationRow>();

  if (error || !data) {
    return {
      id: null,
      status: "missing",
      managerReviewNotes: null,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
      documents: [],
      documentPolicy: calculateBorrowerVerificationDocumentPolicy([]),
    };
  }

  const { data: documents } = await supabase
    .from("borrower_verification_documents")
    .select(
      "id, borrower_verification_id, borrower_id, storage_bucket, storage_path, document_type, file_name, file_type, file_size, status, uploaded_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at",
    )
    .eq("borrower_verification_id", data.id)
    .order("uploaded_at", { ascending: false });

  const mappedDocuments = (documents ?? []).map(
    mapBorrowerVerificationDocumentRow,
  );

  return {
    id: data.id,
    status: data.verification_status,
    managerReviewNotes: data.manager_review_notes,
    rejectionReason: data.rejection_reason,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    documents: mappedDocuments,
    documentPolicy: calculateBorrowerVerificationDocumentPolicy(mappedDocuments),
  };
}

export function mapBorrowerVerificationDocumentRow(
  row: BorrowerVerificationDocumentRow,
): BorrowerVerificationDocumentSummary {
  return {
    id: row.id,
    borrowerVerificationId: row.borrower_verification_id,
    documentType: row.document_type,
    status: row.status,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
  };
}

export function isBorrowerVerificationDocumentType(
  value: FormDataEntryValue | null,
): value is BorrowerVerificationDocumentType {
  return (
    typeof value === "string" &&
    borrowerVerificationDocumentTypes.includes(
      value as BorrowerVerificationDocumentType,
    )
  );
}

export function createSafeUploadFileName(fileName: string, fallbackName: string) {
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  return normalized || fallbackName;
}

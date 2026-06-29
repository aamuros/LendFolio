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

export const borrowerValidIdTypes = [
  "student_id",
  "drivers_license",
  "passport",
  "sss",
  "postal_id",
] as const;

export type BorrowerValidIdType = (typeof borrowerValidIdTypes)[number];

export const borrowerValidIdTypeLabels: Record<BorrowerValidIdType, string> = {
  student_id: "Student ID",
  drivers_license: "Driver's license",
  passport: "Passport",
  sss: "SSS",
  postal_id: "Postal ID",
};

export type BorrowerVerificationDocumentStatus =
  Database["public"]["Enums"]["borrower_verification_document_status"];

export type BorrowerVerificationDocumentSummary = {
  id: string;
  borrowerVerificationId: string;
  documentType: BorrowerVerificationDocumentType;
  validIdType: BorrowerValidIdType | null;
  status: BorrowerVerificationDocumentStatus;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  viewUrl: string | null;
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

export const borrowerVerificationDocumentTypeDescriptions: Record<
  BorrowerVerificationDocumentType,
  string
> = {
  valid_id:
    "Choose Student ID, driver's license, passport, SSS, or Postal ID.",
  business_proof:
    "Barangay business permit, DTI/SEC/CDA registration, mayor's permit, store photo with signage, supplier invoice, or sales record.",
  address_proof: "Utility bill, lease agreement, or barangay certificate.",
  business_registration: "DTI, SEC, or CDA registration certificate.",
  other: "Other supporting documents.",
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

export type BusinessProofStatus =
  | "accepted"
  | "pending"
  | "rejected"
  | "missing";

type BusinessProofDocumentLike = {
  type?: unknown;
  document_type?: unknown;
  documentType?: unknown;
  category?: unknown;
  kind?: unknown;
  status?: unknown;
};

export function normalizeVerificationValue(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function isAcceptedVerificationStatus(status: unknown) {
  return ["accepted", "approved", "verified"].includes(
    normalizeVerificationValue(status),
  );
}

export function isBorrowerValidIdType(
  value: unknown,
): value is BorrowerValidIdType {
  return (
    typeof value === "string" &&
    borrowerValidIdTypes.includes(value as BorrowerValidIdType)
  );
}

export function isPendingVerificationStatus(status: unknown) {
  return ["pending", "submitted", "under_review", "in_review"].includes(
    normalizeVerificationValue(status),
  );
}

export function isRejectedVerificationStatus(status: unknown) {
  return ["rejected", "declined"].includes(normalizeVerificationValue(status));
}

export function isBusinessProofDocument(doc: BusinessProofDocumentLike) {
  const type = normalizeVerificationValue(
    doc.type ?? doc.document_type ?? doc.documentType ?? doc.category ?? doc.kind,
  );

  return [
    "business_proof",
    "business_registration",
    "business_registration_proof",
    "business_permit",
    "dti_registration",
    "sec_registration",
    "mayor_permit",
    "barangay_business_permit",
  ].includes(type);
}

export function getBusinessProofStatus(
  documents: BusinessProofDocumentLike[] = [],
): BusinessProofStatus {
  const businessDocs = documents.filter(isBusinessProofDocument);

  if (businessDocs.some((doc) => isAcceptedVerificationStatus(doc.status))) {
    return "accepted";
  }
  if (businessDocs.some((doc) => isPendingVerificationStatus(doc.status))) {
    return "pending";
  }
  if (businessDocs.some((doc) => isRejectedVerificationStatus(doc.status))) {
    return "rejected";
  }

  return "missing";
}

export function calculateBorrowerVerificationDocumentPolicy(
  documents: Pick<
    BorrowerVerificationDocumentSummary,
    "documentType" | "status"
  >[],
  verificationStatus?: BorrowerVerificationStatus | "missing",
): BorrowerVerificationDocumentPolicy {
  const replacementRequired = verificationStatus === "needs_resubmission";
  const latestByType = new Map<
    BorrowerVerificationDocumentType,
    (typeof documents)[number]
  >();
  for (const doc of documents) {
    if (!latestByType.has(doc.documentType)) {
      latestByType.set(doc.documentType, doc);
    }
  }

  const submitted = new Set<BorrowerVerificationDocumentType>();
  const accepted = new Set<BorrowerVerificationDocumentType>();
  const rejected = new Set<BorrowerVerificationDocumentType>();
  const businessProofStatus = replacementRequired
    ? getBusinessProofStatus(
        documents
          .filter((document) => document.status !== "accepted")
          .map((document) => ({
            documentType: document.documentType,
            status: document.status,
          })),
      )
    : getBusinessProofStatus(
        documents.map((document) => ({
          documentType: document.documentType,
          status: document.status,
        })),
      );

  for (const document of latestByType.values()) {
    if (
      document.status === "submitted" ||
      (document.status === "accepted" && !replacementRequired)
    ) {
      submitted.add(document.documentType);
    }

    if (document.status === "accepted" && !replacementRequired) {
      accepted.add(document.documentType);
    }

    if (document.status === "rejected") {
      rejected.add(document.documentType);
    }
  }

  if (businessProofStatus === "accepted") {
    accepted.add("business_proof");
  }
  if (businessProofStatus === "accepted" || businessProofStatus === "pending") {
    submitted.add("business_proof");
  }
  if (businessProofStatus === "rejected") {
    rejected.add("business_proof");
  }

  const effectiveMissingRequiredDocumentTypes =
    requiredBorrowerVerificationDocumentTypes.filter(
      (documentType) => !accepted.has(documentType),
    );

  return {
    requiredDocumentTypes: [...requiredBorrowerVerificationDocumentTypes],
    missingRequiredDocumentTypes: effectiveMissingRequiredDocumentTypes,
    submittedDocumentTypes: [...submitted],
    acceptedDocumentTypes: [...accepted],
    rejectedDocumentTypes: [...rejected],
    readyForManagerReview: requiredBorrowerVerificationDocumentTypes.every(
      (documentType) => submitted.has(documentType),
    ),
    documentsAccepted: effectiveMissingRequiredDocumentTypes.length === 0,
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
    if (verification.documentPolicy.documentsAccepted) {
      return "Borrower verification approved.";
    }

    if (
      !verification.documentPolicy.acceptedDocumentTypes.includes(
        "business_proof",
      )
    ) {
      return "Upload and wait for approval of your business proof before applying.";
    }

    return "Required verification documents must be accepted before applying.";
  }

  if (
    verification.status === "rejected" ||
    verification.status === "needs_resubmission"
  ) {
    return "Your borrower verification needs updates before applying.";
  }

  if (!verification.documentPolicy.readyForManagerReview) {
    return "Upload accepted verification documents before applying.";
  }

  return "Your borrower verification documents are being checked.";
}

export async function getBorrowerVerificationStatus(
  supabase: SupabaseServerClient,
  borrowerId: string,
  { includeSignedUrls = false }: { includeSignedUrls?: boolean } = {},
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
      "id, borrower_verification_id, borrower_id, storage_bucket, storage_path, document_type, valid_id_type, file_name, file_type, file_size, status, uploaded_at, reviewed_at, reviewed_by, review_notes, ai_review_status, ai_review_confidence, ai_detected_document_type, ai_review_reason, ai_risk_flags, ai_model, ai_reviewed_at, created_at, updated_at",
    )
    .eq("borrower_verification_id", data.id)
    .order("uploaded_at", { ascending: false });

  const mappedDocuments = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const summary = mapBorrowerVerificationDocumentRow(doc);

      if (includeSignedUrls && doc.storage_bucket && doc.storage_path) {
        try {
          const { data: signed } = await supabase.storage
            .from(doc.storage_bucket)
            .createSignedUrl(doc.storage_path, 3600);
          summary.viewUrl = signed?.signedUrl ?? null;
        } catch {
          summary.viewUrl = null;
        }
      }

      return summary;
    }),
  );

  return {
    id: data.id,
    status: data.verification_status,
    managerReviewNotes: data.manager_review_notes,
    rejectionReason: data.rejection_reason,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    documents: mappedDocuments,
    documentPolicy: calculateBorrowerVerificationDocumentPolicy(
      mappedDocuments,
      data.verification_status,
    ),
  };
}

export function mapBorrowerVerificationDocumentRow(
  row: BorrowerVerificationDocumentRow,
): BorrowerVerificationDocumentSummary {
  return {
    id: row.id,
    borrowerVerificationId: row.borrower_verification_id,
    documentType: row.document_type,
    validIdType: isBorrowerValidIdType(row.valid_id_type)
      ? row.valid_id_type
      : null,
    status: row.status,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    viewUrl: null,
  };
}

export type BorrowerFacingVerificationState =
  | "missing_disclosures"
  | "missing_documents"
  | "waiting_review"
  | "under_review"
  | "needs_update"
  | "approved";

export const borrowerFacingVerificationStateLabels: Record<
  BorrowerFacingVerificationState,
  string
> = {
  missing_disclosures: "Accept disclosures",
  missing_documents: "Documents needed",
  waiting_review: "Checking documents",
  under_review: "Checking documents",
  needs_update: "Needs update",
  approved: "Approved",
};

export const borrowerFacingVerificationStateDescriptions: Record<
  BorrowerFacingVerificationState,
  string
> = {
  missing_disclosures:
    "Accept the verification disclosures before uploading documents.",
  missing_documents: "Upload your Valid ID and Business proof to continue.",
  waiting_review:
    "Your required documents are being checked. Upload a replacement if a document is not accepted.",
  under_review: "Your verification documents are being checked.",
  needs_update:
    "Some profile details changed after approval. Please replace your verification documents so we can review the updated information.",
  approved: "Your borrower verification is approved.",
};

export function getBorrowerFacingVerificationState(
  verification: BorrowerVerificationSummary,
  disclosuresCurrent: boolean,
): BorrowerFacingVerificationState {
  if (verification.status === "approved") {
    return "approved";
  }

  if (
    verification.status === "rejected" ||
    verification.status === "needs_resubmission"
  ) {
    return "needs_update";
  }

  if (
    verification.status === "submitted" ||
    verification.status === "under_review"
  ) {
    return "under_review";
  }

  if (!disclosuresCurrent) {
    return "missing_disclosures";
  }

  if (verification.documentPolicy.readyForManagerReview) {
    return "waiting_review";
  }

  return "missing_documents";
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

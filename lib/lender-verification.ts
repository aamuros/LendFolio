import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
type LenderProfileRow = Database["public"]["Tables"]["lender_profiles"]["Row"];
type LenderVerificationDocumentRow =
  Database["public"]["Tables"]["lender_verification_documents"]["Row"];

export type LenderVerificationStatus =
  Database["public"]["Enums"]["lender_verification_status"];

export type LenderVerificationDocumentType =
  Database["public"]["Enums"]["lender_verification_document_type"];

export type LenderVerificationDocumentStatus =
  Database["public"]["Enums"]["lender_verification_document_status"];

export type LenderVerificationDocumentSummary = {
  id: string;
  lenderProfileId: string;
  lenderId: string;
  documentType: LenderVerificationDocumentType;
  status: LenderVerificationDocumentStatus;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
};

export type LenderVerificationDocumentPolicy = {
  requiredDocumentTypes: LenderVerificationDocumentType[];
  missingRequiredDocumentTypes: LenderVerificationDocumentType[];
  submittedDocumentTypes: LenderVerificationDocumentType[];
  acceptedDocumentTypes: LenderVerificationDocumentType[];
  rejectedDocumentTypes: LenderVerificationDocumentType[];
  readyForManagerReview: boolean;
  documentsAccepted: boolean;
};

export type LenderVerificationSummary = {
  id: string | null;
  status: LenderVerificationStatus | "missing";
  managerReviewNotes: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  documents: LenderVerificationDocumentSummary[];
  documentPolicy: LenderVerificationDocumentPolicy;
};

export const lenderVerificationDocumentBucket =
  "lender-verification-documents";

export const lenderVerificationDocumentMaxFileSize = 5 * 1024 * 1024;

export const lenderVerificationDocumentAllowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const lenderVerificationDocumentTypes = [
  "business_registration",
  "valid_id",
  "authorization_letter",
  "proof_of_address",
  "other",
] as const satisfies LenderVerificationDocumentType[];

export const requiredLenderVerificationDocumentTypes = [
  "business_registration",
  "valid_id",
] as const satisfies LenderVerificationDocumentType[];

export const lenderVerificationDocumentTypeLabels: Record<
  LenderVerificationDocumentType,
  string
> = {
  business_registration: "Business registration",
  valid_id: "Authorized representative ID",
  authorization_letter: "Authorization letter",
  proof_of_address: "Proof of address",
  other: "Other",
};

export const lenderVerificationDocumentStatusLabels: Record<
  LenderVerificationDocumentStatus,
  string
> = {
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Superseded",
};

export const lenderVerificationStatusLabels: Record<
  LenderVerificationStatus | "missing",
  string
> = {
  missing: "Missing",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

export function calculateLenderVerificationDocumentPolicy(
  documents: Pick<LenderVerificationDocumentSummary, "documentType" | "status">[],
): LenderVerificationDocumentPolicy {
  const submitted = new Set<LenderVerificationDocumentType>();
  const accepted = new Set<LenderVerificationDocumentType>();
  const rejected = new Set<LenderVerificationDocumentType>();

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
    requiredLenderVerificationDocumentTypes.filter(
      (documentType) => !accepted.has(documentType),
    );

  return {
    requiredDocumentTypes: [...requiredLenderVerificationDocumentTypes],
    missingRequiredDocumentTypes,
    submittedDocumentTypes: [...submitted],
    acceptedDocumentTypes: [...accepted],
    rejectedDocumentTypes: [...rejected],
    readyForManagerReview: requiredLenderVerificationDocumentTypes.every(
      (documentType) => submitted.has(documentType),
    ),
    documentsAccepted: missingRequiredDocumentTypes.length === 0,
  };
}

export async function getLenderVerificationStatus(
  supabase: SupabaseServerClient,
  lenderId: string,
): Promise<LenderVerificationSummary> {
  const { data, error } = await supabase
    .from("lender_profiles")
    .select(
      "id, user_id, verification_status, approved_at, manager_review_notes, rejection_reason, rejected_at",
    )
    .eq("user_id", lenderId)
    .maybeSingle<
      Pick<
        LenderProfileRow,
        | "id"
        | "user_id"
        | "verification_status"
        | "approved_at"
        | "manager_review_notes"
        | "rejection_reason"
        | "rejected_at"
      >
    >();

  if (error || !data) {
    return {
      id: null,
      status: "missing",
      managerReviewNotes: null,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
      documents: [],
      documentPolicy: calculateLenderVerificationDocumentPolicy([]),
    };
  }

  const { data: documents } = await supabase
    .from("lender_verification_documents")
    .select(
      "id, lender_profile_id, lender_id, storage_bucket, storage_path, document_type, file_name, file_type, file_size, status, uploaded_at, reviewed_at, reviewed_by, review_notes, created_at, updated_at",
    )
    .eq("lender_profile_id", data.id)
    .order("uploaded_at", { ascending: false });

  const mappedDocuments = (documents ?? []).map(
    mapLenderVerificationDocumentRow,
  );

  return {
    id: data.id,
    status: data.verification_status,
    managerReviewNotes: data.manager_review_notes,
    rejectionReason: data.rejection_reason,
    submittedAt: null,
    reviewedAt: data.approved_at ?? data.rejected_at,
    documents: mappedDocuments,
    documentPolicy: calculateLenderVerificationDocumentPolicy(mappedDocuments),
  };
}

export function mapLenderVerificationDocumentRow(
  row: LenderVerificationDocumentRow,
): LenderVerificationDocumentSummary {
  return {
    id: row.id,
    lenderProfileId: row.lender_profile_id,
    lenderId: row.lender_id,
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

export function isLenderVerificationDocumentType(
  value: FormDataEntryValue | null,
): value is LenderVerificationDocumentType {
  return (
    typeof value === "string" &&
    lenderVerificationDocumentTypes.includes(
      value as LenderVerificationDocumentType,
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

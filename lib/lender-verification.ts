import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
type LenderVerificationDocumentRow =
  Database["public"]["Tables"]["lender_verification_documents"]["Row"];

export type LenderVerificationDocumentType =
  Database["public"]["Enums"]["lender_verification_document_type"];

export type LenderVerificationDocumentStatus =
  Database["public"]["Enums"]["lender_verification_document_status"];

export type LenderVerificationDocumentSummary = {
  id: string;
  lenderProfileId: string;
  documentType: LenderVerificationDocumentType;
  status: LenderVerificationDocumentStatus;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  viewUrl: string | null;
};

export const lenderVerificationDocumentBucket =
  "lender-verification-documents";

export const lenderVerificationDocumentMaxFileSize = 5 * 1024 * 1024;

export const lenderVerificationDocumentAllowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

export const lenderVerificationDocumentTypes = [
  "business_registration",
  "authorized_representative_id",
  "authorization_letter",
  "lending_license",
  "proof_of_address",
  "collection_policy",
  "sample_loan_terms",
  "other",
] as const satisfies LenderVerificationDocumentType[];

export const requiredLenderVerificationDocumentTypes = [
  "business_registration",
  "authorized_representative_id",
  "authorization_letter",
  "lending_license",
  "proof_of_address",
] as const satisfies LenderVerificationDocumentType[];

export const lenderVerificationDocumentTypeLabels: Record<
  LenderVerificationDocumentType,
  string
> = {
  business_registration: "Business registration",
  authorized_representative_id: "Authorized representative ID",
  authorization_letter: "Authorization letter",
  lending_license: "Lending license",
  proof_of_address: "Proof of address",
  collection_policy: "Collection policy",
  sample_loan_terms: "Sample loan terms",
  other: "Other",
};

export const lenderVerificationDocumentTypeDescriptions: Record<
  LenderVerificationDocumentType,
  string
> = {
  business_registration:
    "DTI, SEC, or CDA registration certificate for the lending organization.",
  authorized_representative_id:
    "Government-issued ID of the authorized representative signing on behalf of the organization.",
  authorization_letter:
    "Board resolution or letter authorizing the representative to transact on behalf of the lending entity.",
  lending_license:
    "BSP, SEC lending registration, or other regulatory lending license or authority.",
  proof_of_address:
    "Utility bill, lease agreement, or official document showing the registered business address.",
  collection_policy:
    "Internal collection policy or guidelines document (optional).",
  sample_loan_terms:
    "Sample loan agreement or terms sheet provided to borrowers (optional).",
  other:
    "Other supporting documents relevant to lender verification (optional).",
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

export type LenderVerificationDocumentPolicy = {
  requiredDocumentTypes: LenderVerificationDocumentType[];
  missingRequiredDocumentTypes: LenderVerificationDocumentType[];
  submittedDocumentTypes: LenderVerificationDocumentType[];
  acceptedDocumentTypes: LenderVerificationDocumentType[];
  rejectedDocumentTypes: LenderVerificationDocumentType[];
  readyForManagerReview: boolean;
  documentsAccepted: boolean;
};

export function calculateLenderVerificationDocumentPolicy(
  documents: Pick<
    LenderVerificationDocumentSummary,
    "documentType" | "status"
  >[],
): LenderVerificationDocumentPolicy {
  const latestByType = new Map<
    LenderVerificationDocumentType,
    (typeof documents)[number]
  >();
  for (const doc of documents) {
    if (!latestByType.has(doc.documentType)) {
      latestByType.set(doc.documentType, doc);
    }
  }

  const submitted = new Set<LenderVerificationDocumentType>();
  const accepted = new Set<LenderVerificationDocumentType>();
  const rejected = new Set<LenderVerificationDocumentType>();

  for (const document of latestByType.values()) {
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

export function mapLenderVerificationDocumentRow(
  row: LenderVerificationDocumentRow,
): LenderVerificationDocumentSummary {
  return {
    id: row.id,
    lenderProfileId: row.lender_profile_id,
    documentType: row.document_type,
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

export async function getLenderVerificationDocuments(
  supabase: SupabaseServerClient,
  lenderProfileId: string,
  lenderId: string,
  { includeSignedUrls = false }: { includeSignedUrls?: boolean } = {},
): Promise<LenderVerificationDocumentSummary[]> {
  const { data: documents } = await supabase
    .from("lender_verification_documents")
    .select(
      "id, lender_id, lender_profile_id, storage_bucket, storage_path, document_type, file_name, file_type, file_size, status, uploaded_at, reviewed_at, reviewed_by, review_notes, ai_review_status, ai_review_confidence, ai_detected_document_type, ai_review_reason, ai_risk_flags, ai_model, ai_reviewed_at, created_at, updated_at",
    )
    .eq("lender_profile_id", lenderProfileId)
    .order("uploaded_at", { ascending: false });

  return Promise.all(
    (documents ?? []).map(async (doc) => {
      const summary = mapLenderVerificationDocumentRow(doc);

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

export type LenderProfileChangeRequestStatus =
  Database["public"]["Enums"]["lender_profile_change_request_status"];

export const lenderProfileChangeRequestStatusLabels: Record<
  LenderProfileChangeRequestStatus,
  string
> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

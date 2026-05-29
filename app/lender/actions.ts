"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile, requireApprovedLender } from "@/lib/access-control";
import {
  getRequiredConsentVersions,
  hasCurrentRequiredConsents,
  type UserConsentRecord,
} from "@/lib/consents";
import {
  createSafeUploadFileName,
  isLenderVerificationDocumentType,
  lenderVerificationDocumentAllowedTypes,
  lenderVerificationDocumentBucket,
  lenderVerificationDocumentMaxFileSize,
} from "@/lib/lender-verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RepaymentProofReviewResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type LenderVerificationDocumentSubmitResult =
  | {
      ok: true;
      message: string;
      documentId: string;
    }
  | {
      ok: false;
      code?: "consent_required";
      message: string;
    };

export async function submitLenderVerificationDocument(
  _previousState: LenderVerificationDocumentSubmitResult | null,
  formData: FormData,
): Promise<LenderVerificationDocumentSubmitResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await getCurrentUserProfile(supabase);

    if (!access.ok || access.profile.role !== "lender") {
      return {
        ok: false,
        message: "Your account does not have access to this workspace.",
      };
    }

    const lenderProfile = access.profile.lenderProfile;

    if (!lenderProfile) {
      return {
        ok: false,
        message: "Lender profile is unavailable.",
      };
    }

    const userConsents = await loadUserConsents(supabase, access.profile.id);

    if (
      !hasCurrentRequiredConsents(
        userConsents,
        getRequiredConsentVersions("lender_review"),
      )
    ) {
      return {
        ok: false,
        code: "consent_required",
        message:
          "Accept the required disclosures before uploading verification documents.",
      };
    }

    const documentType = formData.get("documentType");
    const documentFile = formData.get("documentFile");

    if (!isLenderVerificationDocumentType(documentType)) {
      return {
        ok: false,
        message: "Choose a verification document type.",
      };
    }

    if (!(documentFile instanceof File) || documentFile.size === 0) {
      return {
        ok: false,
        message: "Choose a verification document to upload.",
      };
    }

    if (!lenderVerificationDocumentAllowedTypes.has(documentFile.type)) {
      return {
        ok: false,
        message: "Upload a JPG, PNG, WebP, or PDF file.",
      };
    }

    if (documentFile.size > lenderVerificationDocumentMaxFileSize) {
      return {
        ok: false,
        message: "Upload a file up to 5 MB.",
      };
    }

    if (lenderProfile.verification_status === "approved") {
      return {
        ok: false,
        message: "This lender profile is already approved.",
      };
    }

    const safeFileName = createSafeUploadFileName(
      documentFile.name,
      "verification-document",
    );
    const storagePath = [
      "lenders",
      access.profile.id,
      "verification",
      lenderProfile.id,
      `${Date.now()}-${safeFileName}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(lenderVerificationDocumentBucket)
      .upload(storagePath, documentFile, {
        contentType: documentFile.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        ok: false,
        message: "Could not upload verification document.",
      };
    }

    const { data, error } = await supabase.rpc(
      "submit_lender_verification_document",
      {
        p_lender_profile_id: lenderProfile.id,
        p_storage_path: storagePath,
        p_document_type: documentType,
        p_file_name: documentFile.name,
        p_file_type: documentFile.type,
        p_file_size: documentFile.size,
      },
    );

    const result = data as
      | {
          ok?: boolean;
          code?: string;
          message?: string;
          document_id?: string;
        }
      | null;

    if (error || !result?.ok || !result.document_id) {
      await supabase.storage
        .from(lenderVerificationDocumentBucket)
        .remove([storagePath]);

      return {
        ok: false,
        code:
          result?.code === "consent_required" ? "consent_required" : undefined,
        message: result?.message ?? "Could not save verification document.",
      };
    }

    revalidatePath("/lender");
    revalidatePath("/manager");
    revalidatePath("/manager/lenders");

    return {
      ok: true,
      message: result.message ?? "Verification document uploaded.",
      documentId: result.document_id,
    };
  } catch {
    return {
      ok: false,
      message: "Could not upload verification document.",
    };
  }
}

async function loadUserConsents(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<UserConsentRecord[]> {
  const { data, error } = await supabase
    .from("user_consents")
    .select("consent_type, version, accepted_at")
    .eq("user_id", userId)
    .order("accepted_at", { ascending: false });

  if (error) {
    return [];
  }

  return data.map((consent) => ({
    consentType: consent.consent_type,
    version: consent.version,
    acceptedAt: consent.accepted_at,
  }));
}

export async function verifyRepaymentProof(
  proofId: string,
): Promise<RepaymentProofReviewResult> {
  return reviewRepaymentProof(proofId, "verified");
}

export async function rejectRepaymentProof(
  proofId: string,
  reviewNotes: string,
): Promise<RepaymentProofReviewResult> {
  return reviewRepaymentProof(proofId, "rejected", reviewNotes);
}

async function reviewRepaymentProof(
  proofId: string,
  decision: "verified" | "rejected",
  reviewNotes = "",
): Promise<RepaymentProofReviewResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("review_repayment_proof", {
      p_proof_id: proofId,
      p_decision: decision,
      p_review_notes: reviewNotes,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
        }
      | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message:
          result?.message ??
          (decision === "verified"
            ? "Could not verify repayment."
            : "Could not reject proof."),
      };
    }

    revalidatePath("/borrower");
    revalidatePath("/lender");
    revalidatePath("/lender/applications");

    return {
      ok: true,
      message:
        result.message ??
        (decision === "verified" ? "Repayment verified." : "Proof rejected."),
    };
  } catch {
    return {
      ok: false,
      message:
        decision === "verified"
          ? "Could not verify repayment."
          : "Could not reject proof.",
    };
  }
}

import { revalidatePath } from "next/cache";
import { checkVerificationDocumentWithAi } from "@/lib/ai/document-checker";
import {
  getDocumentAiUploadMessage,
  isDocumentAiReviewWarning,
  type DocumentAiReviewStatus,
} from "@/lib/ai/document-review";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSafeUploadFileName,
  isLenderVerificationDocumentType,
  lenderVerificationDocumentAllowedTypes,
  lenderVerificationDocumentBucket,
  lenderVerificationDocumentMaxFileSize,
} from "@/lib/lender-verification";

export type LenderVerificationDocumentSubmitResult =
  | {
      ok: true;
      message: string;
      documentId: string;
      aiReviewStatus?: DocumentAiReviewStatus;
    }
  | {
      ok: false;
      code?: "consent_required";
      message: string;
    };

export async function uploadLenderVerificationDocument(
  formData: FormData,
): Promise<LenderVerificationDocumentSubmitResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Sign in to continue." };
    }

    const documentType = formData.get("documentType");
    const documentFile =
      formData.get("documentFile") ?? formData.get("proofFile");
    const lenderProfileId = String(formData.get("lenderProfileId") ?? "");

    if (!isLenderVerificationDocumentType(documentType)) {
      return { ok: false, message: "Choose a verification document type." };
    }

    if (!(documentFile instanceof File) || documentFile.size === 0) {
      return { ok: false, message: "Choose a verification document to upload." };
    }

    if (!lenderVerificationDocumentAllowedTypes.has(documentFile.type)) {
      return { ok: false, message: "Upload a PDF, JPG, JPEG, or PNG file." };
    }

    if (documentFile.size > lenderVerificationDocumentMaxFileSize) {
      return {
        ok: false,
        message: "This file is too large. Please upload a file under 5 MB.",
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("lender_profiles")
      .select("id, user_id, verification_status")
      .eq("id", lenderProfileId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return { ok: false, message: "Lender profile is unavailable." };
    }

    if (profile.verification_status === "approved") {
      return {
        ok: false,
        message: "This lender verification is already approved.",
      };
    }

    if (
      !["incomplete", "pending", "rejected"].includes(
        profile.verification_status,
      )
    ) {
      return { ok: false, message: "Could not upload verification document." };
    }

    const aiReview = await checkVerificationDocumentWithAi({
      file: documentFile,
      requestedDocumentType: documentType,
      userRole: "lender",
    });

    const safeFileName = createSafeUploadFileName(
      documentFile.name,
      "verification-document",
    );
    const storagePath = [
      "lenders",
      user.id,
      "verification",
      profile.id,
      `${Date.now()}-${safeFileName}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(lenderVerificationDocumentBucket)
      .upload(storagePath, documentFile, {
        contentType: documentFile.type,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, message: "Could not upload verification document." };
    }

    const { data, error } = await supabase.rpc(
      "submit_lender_verification_document",
      {
        p_lender_profile_id: profile.id,
        p_storage_path: storagePath,
        p_document_type: documentType,
        p_file_name: documentFile.name,
        p_file_type: documentFile.type,
        p_file_size: documentFile.size,
        p_ai_review_status: aiReview.aiReviewStatus,
        p_ai_review_confidence: aiReview.confidence,
        p_ai_detected_document_type: aiReview.detectedType,
        p_ai_review_reason: aiReview.reason,
        p_ai_risk_flags: aiReview.riskFlags,
        p_ai_model: aiReview.aiModel,
        p_ai_reviewed_at: aiReview.aiReviewedAt,
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
        message: result?.message ?? "Could not save verification document.",
      };
    }

    const aiUploadMessage = getDocumentAiUploadMessage(
      aiReview.aiReviewStatus,
    );
    const aiReviewStatus = isDocumentAiReviewWarning(aiReview.aiReviewStatus)
      ? aiReview.aiReviewStatus
      : undefined;

    revalidatePath("/lender");
    revalidatePath("/lender/applications");
    revalidatePath("/manager");
    revalidatePath("/manager/lenders");

    return {
      ok: true,
      message: aiUploadMessage ?? result.message ?? "Verification document uploaded.",
      documentId: result.document_id,
      ...(aiReviewStatus ? { aiReviewStatus } : {}),
    };
  } catch {
    return { ok: false, message: "Could not upload verification document." };
  }
}

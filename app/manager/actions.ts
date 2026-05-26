"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManager } from "@/lib/access-control";
import type { Json } from "@/lib/supabase/types";

type LenderReviewResult = {
  ok?: boolean;
  code?: string;
  message?: string;
};

export async function refreshOverdueStatusesAction() {
  const access = await requireManager();

  if (!access.ok) {
    redirect("/manager?overdueRefresh=error");
  }

  const { data, error } = await access.supabase.rpc(
    "refresh_overdue_repayment_statuses",
  );
  const result = data as { ok?: boolean } | null;

  if (error || !result?.ok) {
    redirect("/manager?overdueRefresh=error");
  }

  revalidatePath("/manager");
  revalidatePath("/manager/loans");
  revalidatePath("/manager/repayments");
  revalidatePath("/borrower");
  revalidatePath("/lender");

  redirect("/manager?overdueRefresh=success");
}

export async function reviewLenderAction(formData: FormData) {
  const lenderProfileId = String(formData.get("lenderProfileId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const managerReviewNotes = String(formData.get("managerReviewNotes") ?? "");
  const rejectionReason = String(formData.get("rejectionReason") ?? "");
  const requestedReturnPath = String(
    formData.get("returnPath") ?? "/manager/lenders",
  );
  const returnPath = requestedReturnPath.startsWith("/manager/lenders")
    ? requestedReturnPath
    : "/manager/lenders";
  const access = await requireManager();

  if (!access.ok || !lenderProfileId) {
    redirect(`${returnPath}?review=error`);
  }

  const { data, error } = await access.supabase.rpc(
    "review_lender_verification",
    {
      p_lender_profile_id: lenderProfileId,
      p_decision: decision,
      p_manager_review_notes: managerReviewNotes,
      p_rejection_reason: rejectionReason,
    },
  );
  const result = data as Json as LenderReviewResult | null;

  if (error || !result?.ok) {
    redirect(
      `${returnPath}?review=${
        result?.code === "consent_required" ? "consent-required" : "error"
      }`,
    );
  }

  revalidatePath("/manager");
  revalidatePath("/manager/lenders");
  revalidatePath(`/manager/lenders/${lenderProfileId}`);
  revalidatePath("/lender");

  const review =
    decision === "approve"
      ? "approved"
      : decision === "return_to_pending"
        ? "pending"
        : "rejected";

  redirect(`${returnPath}?review=${review}`);
}

export async function reviewBorrowerVerificationAction(formData: FormData) {
  const borrowerId = String(formData.get("borrowerId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const managerReviewNotes = String(formData.get("managerReviewNotes") ?? "");
  const rejectionReason = String(formData.get("rejectionReason") ?? "");
  const access = await requireManager();

  if (!access.ok || !borrowerId) {
    redirect("/manager/borrower-verifications?review=error");
  }

  const { data, error } = await access.supabase.rpc(
    "review_borrower_verification",
    {
      p_borrower_id: borrowerId,
      p_decision: decision,
      p_manager_review_notes: managerReviewNotes,
      p_rejection_reason: rejectionReason,
    },
  );
  const result = data as Json as LenderReviewResult | null;

  if (error || !result?.ok) {
    redirect(
      `/manager/borrower-verifications?review=${
        result?.code === "documents_required" ? "documents-required" : "error"
      }`,
    );
  }

  revalidatePath("/manager");
  revalidatePath("/manager/borrower-verifications");
  revalidatePath("/borrower");

  const review =
    decision === "approve"
      ? "approved"
      : decision === "needs_resubmission"
        ? "needs-resubmission"
      : decision === "return_to_pending"
        ? "pending"
        : "rejected";

  redirect(`/manager/borrower-verifications?review=${review}`);
}

export async function reviewBorrowerVerificationDocumentAction(
  formData: FormData,
) {
  const documentId = String(formData.get("documentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");
  const access = await requireManager();

  if (!access.ok || !documentId) {
    redirect("/manager/borrower-verifications?documentReview=error");
  }

  const { data, error } = await access.supabase.rpc(
    "review_borrower_verification_document",
    {
      p_document_id: documentId,
      p_decision: decision,
      p_review_notes: reviewNotes,
    },
  );
  const result = data as Json as LenderReviewResult | null;

  if (error || !result?.ok) {
    redirect("/manager/borrower-verifications?documentReview=error");
  }

  revalidatePath("/manager");
  revalidatePath("/manager/borrower-verifications");
  revalidatePath("/borrower");

  const review = decision === "accept" ? "accepted" : "rejected";

  redirect(`/manager/borrower-verifications?documentReview=${review}`);
}

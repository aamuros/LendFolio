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

function buildReturnQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return qs.toString();
}

export async function refreshOverdueStatusesAction(formData?: FormData) {
  const returnPath = String(formData?.get("returnPath") ?? "/manager");
  const safeReturnPath = returnPath.startsWith("/manager")
    ? returnPath
    : "/manager";

  const access = await requireManager();

  if (!access.ok) {
    redirect(`${safeReturnPath}?overdueRefresh=error`);
  }

  const { data, error } = await access.supabase.rpc(
    "refresh_overdue_repayment_statuses",
  );
  const result = data as { ok?: boolean } | null;

  if (error || !result?.ok) {
    redirect(`${safeReturnPath}?overdueRefresh=error`);
  }

  revalidatePath("/manager");
  revalidatePath("/manager/loans");
  revalidatePath("/manager/repayments");
  revalidatePath("/borrower");
  revalidatePath("/lender");

  redirect(`${safeReturnPath}?overdueRefresh=success`);
}

export async function reviewLenderAction(formData: FormData) {
  const lenderProfileId = String(formData.get("lenderProfileId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const managerReviewNotes = String(formData.get("managerReviewNotes") ?? "");
  const rejectionReason = String(formData.get("rejectionReason") ?? "");
  const selected = String(formData.get("selected") ?? "");
  const access = await requireManager();

  if (!access.ok || !lenderProfileId) {
    const qs = buildReturnQuery({ review: "error", selected });
    redirect(`/manager/lenders?${qs}`);
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
    const reviewCode =
      result?.code === "consent_required" ? "consent-required" : "error";
    const qs = buildReturnQuery({ review: reviewCode, selected });
    redirect(`/manager/lenders?${qs}`);
  }

  revalidatePath("/manager");
  revalidatePath("/manager/lenders");
  revalidatePath("/lender");

  const review =
    decision === "approve"
      ? "approved"
      : decision === "return_to_pending"
        ? "pending"
        : "rejected";

  const qs = buildReturnQuery({ review, selected });
  redirect(`/manager/lenders?${qs}`);
}

export async function reviewBorrowerVerificationAction(formData: FormData) {
  const borrowerId = String(formData.get("borrowerId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const managerReviewNotes = String(formData.get("managerReviewNotes") ?? "");
  const rejectionReason = String(formData.get("rejectionReason") ?? "");
  const selected = String(formData.get("selected") ?? "");
  const access = await requireManager();

  if (!access.ok || !borrowerId) {
    const qs = buildReturnQuery({ review: "error", selected });
    redirect(`/manager/borrower-verifications?${qs}`);
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
    const reviewCode =
      result?.code === "documents_required" ? "documents-required" : "error";
    const qs = buildReturnQuery({ review: reviewCode, selected });
    redirect(`/manager/borrower-verifications?${qs}`);
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

  const qs = buildReturnQuery({ review, selected });
  redirect(`/manager/borrower-verifications?${qs}`);
}

export async function reviewBorrowerVerificationDocumentAction(
  formData: FormData,
) {
  const documentId = String(formData.get("documentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");
  const selected = String(formData.get("selected") ?? "");
  const access = await requireManager();

  if (!access.ok || !documentId) {
    const qs = buildReturnQuery({ documentReview: "error", selected });
    redirect(`/manager/borrower-verifications?${qs}`);
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
    const qs = buildReturnQuery({ documentReview: "error", selected });
    redirect(`/manager/borrower-verifications?${qs}`);
  }

  revalidatePath("/manager");
  revalidatePath("/manager/borrower-verifications");
  revalidatePath("/borrower");

  const review = decision === "accept" ? "accepted" : "rejected";
  const qs = buildReturnQuery({ documentReview: review, selected });
  redirect(`/manager/borrower-verifications?${qs}`);
}

export async function reviewLenderVerificationDocumentAction(
  formData: FormData,
) {
  const documentId = String(formData.get("documentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");
  const selected = String(formData.get("selected") ?? "");
  const access = await requireManager();

  if (!access.ok || !documentId) {
    const qs = buildReturnQuery({ documentReview: "error", selected });
    redirect(`/manager/lenders?${qs}`);
  }

  const { data, error } = await access.supabase.rpc(
    "review_lender_verification_document",
    {
      p_document_id: documentId,
      p_decision: decision,
      p_review_notes: reviewNotes,
    },
  );
  const result = data as Json as LenderReviewResult | null;

  if (error || !result?.ok) {
    const qs = buildReturnQuery({ documentReview: "error", selected });
    redirect(`/manager/lenders?${qs}`);
  }

  revalidatePath("/manager");
  revalidatePath("/manager/lenders");
  revalidatePath("/lender");

  const review = decision === "accept" ? "accepted" : "rejected";
  const qs = buildReturnQuery({ documentReview: review, selected });
  redirect(`/manager/lenders?${qs}`);
}

export async function reviewLenderProfileChangeRequestAction(
  formData: FormData,
) {
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const managerReviewNotes = String(formData.get("managerReviewNotes") ?? "");
  const rejectionReason = String(formData.get("rejectionReason") ?? "");
  const selected = String(formData.get("selected") ?? "");
  const access = await requireManager();

  if (!access.ok || !requestId) {
    const qs = buildReturnQuery({ changeRequestReview: "error", selected });
    redirect(`/manager/lenders?${qs}`);
  }

  const { data, error } = await access.supabase.rpc(
    "review_lender_profile_change_request",
    {
      p_request_id: requestId,
      p_decision: decision,
      p_manager_review_notes: managerReviewNotes,
      p_rejection_reason: rejectionReason,
    },
  );
  const result = data as Json as LenderReviewResult | null;

  if (error || !result?.ok) {
    const qs = buildReturnQuery({ changeRequestReview: "error", selected });
    redirect(`/manager/lenders?${qs}`);
  }

  revalidatePath("/manager");
  revalidatePath("/manager/lenders");
  revalidatePath("/lender");

  const review = decision === "approve" ? "approved" : "rejected";
  const qs = buildReturnQuery({ changeRequestReview: review, selected });
  redirect(`/manager/lenders?${qs}`);
}

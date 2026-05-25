"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManager } from "@/lib/access-control";
import type { Json } from "@/lib/supabase/types";

type LenderReviewResult = {
  ok?: boolean;
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
  const access = await requireManager();

  if (!access.ok || !lenderProfileId) {
    redirect("/manager/lenders?review=error");
  }

  const { data, error } = await access.supabase.rpc(
    "review_lender_verification",
    {
      p_lender_profile_id: lenderProfileId,
      p_decision: decision,
    },
  );
  const result = data as Json as LenderReviewResult | null;

  if (error || !result?.ok) {
    redirect("/manager/lenders?review=error");
  }

  revalidatePath("/manager");
  revalidatePath("/manager/lenders");
  revalidatePath("/lender");

  redirect(
    `/manager/lenders?review=${decision === "approve" ? "approved" : "rejected"}`,
  );
}

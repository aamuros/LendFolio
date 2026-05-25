"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManager } from "@/lib/access-control";

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

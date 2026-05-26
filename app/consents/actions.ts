"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUserProfile } from "@/lib/access-control";
import {
  getRequiredConsentVersions,
  toConsentRpcPayload,
  type ConsentScope,
} from "@/lib/consents";
import type { Json } from "@/lib/supabase/types";

export type ConsentActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
      missingConsents?: ReturnType<typeof getRequiredConsentVersions>;
    };

const supportedScopes = new Set<ConsentScope>([
  "borrower_document_upload",
  "borrower_loan_application",
  "lender_review",
]);

export async function acceptUserConsentsAction(
  scope: ConsentScope,
): Promise<ConsentActionResult> {
  if (!supportedScopes.has(scope)) {
    return { ok: false, message: "Could not accept these disclosures." };
  }

  const access = await getCurrentUserProfile();

  if (!access.ok) {
    return { ok: false, message: access.message };
  }

  const requiredConsents = getRequiredConsentVersions(scope);
  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    null;
  const userAgent = requestHeaders.get("user-agent") ?? null;

  const { data, error } = await access.supabase.rpc("accept_user_consents", {
    p_consents: toConsentRpcPayload(requiredConsents) as Json,
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
  });
  const result = data as { ok?: boolean; message?: string } | null;

  if (error || !result?.ok) {
    return {
      ok: false,
      message: result?.message ?? "Could not accept these disclosures.",
      missingConsents: requiredConsents,
    };
  }

  revalidatePath("/borrower");
  revalidatePath("/lender");
  revalidatePath("/manager");
  revalidatePath("/manager/borrower-verifications");
  revalidatePath("/manager/lenders");

  return {
    ok: true,
    message: result.message ?? "Required disclosures accepted.",
  };
}

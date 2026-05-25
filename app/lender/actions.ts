"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedLender } from "@/lib/access-control";
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

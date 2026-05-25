"use server";

import { revalidatePath } from "next/cache";
import { requireBorrower } from "@/lib/access-control";
import {
  loadBorrowerActiveLoans,
  type ActiveLoanSummary,
} from "@/lib/active-loans";
import {
  borrowerPortfolioSchema,
  mapBorrowerPortfolioRow,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import {
  calculateBorrowerAvailableCredit,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
import {
  loanApplicationSchema,
  mapLoanApplicationRow,
  type LoanApplicationInput,
  type LoanApplicationSummary,
} from "@/lib/loan-application";
import { mapLoanOfferRow, type LoanOfferSummary } from "@/lib/loan-offer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type BorrowerLoanApplicationSummary = LoanApplicationSummary & {
  offers: LoanOfferSummary[];
  activeLoan: ActiveLoanSummary | null;
};

export type BorrowerPortfolioSaveResult =
  | {
      ok: true;
      mode: "supabase";
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "validation" | "supabase";
      message: string;
      fieldErrors?: Partial<Record<keyof BorrowerPortfolioInput, string[]>>;
    };

export type BorrowerPortfolioLoadResult =
  | {
      ok: true;
      mode: "supabase";
      data: BorrowerPortfolioInput | null;
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "supabase";
      data: null;
      message: string;
    };

export type LoanApplicationSubmitResult =
  | {
      ok: true;
      mode: "supabase";
      application: LoanApplicationSummary;
      message: string;
    }
  | {
      ok: false;
      mode:
        | "auth"
        | "validation"
        | "missing-portfolio"
        | "credit-limit"
        | "supabase";
      message: string;
      fieldErrors?: Partial<Record<keyof LoanApplicationInput, string[]>>;
    };

export type LoanApplicationUpdateResult =
  | {
      ok: true;
      application: LoanApplicationSummary;
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "validation" | "supabase";
      message: string;
      fieldErrors?: Partial<Record<keyof LoanApplicationInput, string[]>>;
    };

export type LoanApplicationWithdrawResult =
  | {
      ok: true;
      application: LoanApplicationSummary;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type LoanApplicationsLoadResult =
  | {
      ok: true;
      mode: "supabase";
      applications: BorrowerLoanApplicationSummary[];
      hasPortfolio: boolean;
      creditSummary: BorrowerCreditSummary | null;
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "supabase";
      applications: BorrowerLoanApplicationSummary[];
      hasPortfolio: boolean;
      creditSummary: BorrowerCreditSummary | null;
      message: string;
    };

export type LoanOfferAcceptResult =
  | {
      ok: true;
      message: string;
      activeLoanId: string | null;
    }
  | {
      ok: false;
      message: string;
    };

export type LoanOfferDeclineResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type RepaymentProofSubmitResult =
  | {
      ok: true;
      message: string;
      proofId: string;
    }
  | {
      ok: false;
      message: string;
    };

const repaymentProofBucket = "repayment-proofs";
const repaymentProofMaxFileSize = 5 * 1024 * 1024;
const repaymentProofAllowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const borrowerPortfolioCreditSelect =
  "id, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation";

export async function loadBorrowerPortfolio(): Promise<BorrowerPortfolioLoadResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        data: null,
        message: access.message,
      };
    }

    const { data, error } = await supabase
      .from("borrower_portfolios")
      .select(
        "id, borrower_id, business_type, location, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, loan_purpose_context, created_at, updated_at",
      )
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        data: null,
        message: "Could not load your profile.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      data: data ? mapBorrowerPortfolioRow(data) : null,
      message: data ? "Profile loaded." : "Add your business details to continue.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      data: null,
      message: "Sign in to continue.",
    };
  }
}

export async function saveBorrowerPortfolio(
  values: BorrowerPortfolioInput,
): Promise<BorrowerPortfolioSaveResult> {
  const parsed = borrowerPortfolioSchema.safeParse(values);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      mode: "validation",
      message: "Review the highlighted fields before saving.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        message: access.message,
      };
    }

    const { error } = await supabase.from("borrower_portfolios").upsert(
      {
        borrower_id: access.profile.id,
        business_type: parsed.data.businessType,
        location: parsed.data.location,
        monthly_gross_revenue: parsed.data.monthlyGrossRevenue,
        monthly_expenses: parsed.data.monthlyExpenses,
        existing_loan_payments: parsed.data.existingLoanPayments,
        years_in_operation: parsed.data.yearsInOperation,
        loan_purpose_context: parsed.data.loanPurposeContext,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "borrower_id" },
    );

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        message: "Could not save your profile.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      message: "Profile saved.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      message: "Sign in to continue.",
    };
  }
}

export async function loadBorrowerLoanApplications(): Promise<LoanApplicationsLoadResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        applications: [],
        hasPortfolio: false,
        creditSummary: null,
        message: access.message,
      };
    }

    const { data: portfolio, error: portfolioError } = await supabase
      .from("borrower_portfolios")
      .select(borrowerPortfolioCreditSelect)
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (portfolioError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: false,
        creditSummary: null,
        message: "Could not confirm your profile.",
      };
    }

    const creditSummary = portfolio
      ? await loadBorrowerCreditSummary(access.profile.id, portfolio, supabase)
      : null;

    const { data, error } = await supabase
      .from("loan_applications")
      .select(
        "id, borrower_id, borrower_portfolio_id, requested_amount, credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at",
      )
      .eq("borrower_id", access.profile.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        creditSummary,
        message: "Could not load applications.",
      };
    }

    if (data.length === 0) {
      return {
        ok: true,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        creditSummary,
        message: portfolio
          ? "Applications loaded."
          : "Save your business profile before submitting an application.",
      };
    }

    const applicationIds = data.map((application) => application.id);
    const [offersResult, activeLoansResult] = await Promise.all([
      supabase
        .from("loan_offers")
        .select(
          "id, loan_application_id, borrower_id, lender_id, lender_name, approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at, created_at, updated_at",
        )
        .in("loan_application_id", applicationIds)
        .order("sent_at", { ascending: false }),
      loadBorrowerActiveLoans(access),
    ]);
    const { data: offers, error: offersError } = offersResult;

    if (offersError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        creditSummary,
        message: "Could not load offers.",
      };
    }

    if (!activeLoansResult.ok) {
      return {
        ok: false,
        mode: activeLoansResult.mode,
        applications: [],
        hasPortfolio: Boolean(portfolio),
        creditSummary,
        message: activeLoansResult.message,
      };
    }

    const offersByApplicationId = new Map<string, LoanOfferSummary[]>();

    offers.forEach((offer) => {
      const mappedOffer = mapLoanOfferRow(offer);
      const currentOffers =
        offersByApplicationId.get(mappedOffer.applicationId) ?? [];

      offersByApplicationId.set(mappedOffer.applicationId, [
        ...currentOffers,
        mappedOffer,
      ]);
    });
    const activeLoansByApplicationId = new Map(
      activeLoansResult.loans.map((loan) => [loan.applicationId, loan]),
    );

    return {
      ok: true,
      mode: "supabase",
      applications: data.map((application) => {
        const mappedApplication = mapLoanApplicationRow(application);

        return {
          ...mappedApplication,
          offers: offersByApplicationId.get(mappedApplication.id) ?? [],
          activeLoan: activeLoansByApplicationId.get(mappedApplication.id) ?? null,
        };
      }),
      hasPortfolio: Boolean(portfolio),
      creditSummary,
      message: portfolio
        ? "Applications loaded."
        : "Save your business profile before submitting an application.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      applications: [],
      hasPortfolio: false,
      creditSummary: null,
      message: "Sign in to continue.",
    };
  }
}

async function loadBorrowerCreditSummary(
  borrowerId: string,
  portfolio: {
    monthly_gross_revenue: number;
    monthly_expenses: number;
    existing_loan_payments: number;
    years_in_operation: number;
  },
  verifiedClient?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const supabase = verifiedClient ?? (await createSupabaseServerClient());
  const { data: activeLoans, error } = await supabase
    .from("active_loans")
    .select("outstanding_balance, status")
    .eq("borrower_id", borrowerId)
    .gt("outstanding_balance", 0);

  if (error) {
    return null;
  }

  return calculateBorrowerAvailableCredit({
    portfolio: {
      monthlyGrossRevenue: portfolio.monthly_gross_revenue,
      monthlyExpenses: portfolio.monthly_expenses,
      existingLoanPayments: portfolio.existing_loan_payments,
      yearsInOperation: portfolio.years_in_operation,
    },
    activeLoans: activeLoans.map((loan) => ({
      outstandingBalance: loan.outstanding_balance,
      status: loan.status,
    })),
  });
}

export async function submitLoanApplication(
  values: LoanApplicationInput,
): Promise<LoanApplicationSubmitResult> {
  const parsed = loanApplicationSchema.safeParse(values);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      mode: "validation",
      message: "Review the highlighted fields before submitting.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        message: access.message,
      };
    }

    const { data, error } = await supabase
      .rpc("submit_loan_application", {
        p_requested_amount: parsed.data.requestedAmount,
        p_purpose: parsed.data.purpose,
        p_preferred_term: parsed.data.preferredTerm,
        p_remarks: parsed.data.remarks || "",
      });

    const result = data as
      | {
          ok?: boolean;
          code?: string;
          message?: string;
          application?: Json;
        }
      | null;

    if (error || !result?.ok || !isLoanApplicationRow(result.application)) {
      return {
        ok: false,
        mode:
          result?.code === "missing_portfolio"
            ? "missing-portfolio"
            : result?.code === "credit_limit_exceeded"
              ? "credit-limit"
              : "supabase",
        message: result?.message ?? "Could not submit application.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath("/lender");
    revalidatePath("/lender/applications");

    return {
      ok: true,
      mode: "supabase",
      application: mapLoanApplicationRow(result.application),
      message: result.message ?? "Application submitted.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      message: "Sign in to continue.",
    };
  }
}

export async function updateLoanApplication(
  applicationId: string,
  values: LoanApplicationInput,
): Promise<LoanApplicationUpdateResult> {
  const parsed = loanApplicationSchema.safeParse(values);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();

    return {
      ok: false,
      mode: "validation",
      message: "Review the highlighted fields before saving.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("update_loan_application", {
      p_application_id: applicationId,
      p_requested_amount: parsed.data.requestedAmount,
      p_purpose: parsed.data.purpose,
      p_preferred_term: parsed.data.preferredTerm,
      p_remarks: parsed.data.remarks || "",
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          application?: Json;
        }
      | null;

    if (error || !result?.ok || !isLoanApplicationRow(result.application)) {
      return {
        ok: false,
        mode: "supabase",
        message: result?.message ?? "Could not save changes.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath(`/lender/applications/${applicationId}`);

    return {
      ok: true,
      application: mapLoanApplicationRow(result.application),
      message: result.message ?? "Application updated.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      message: "Sign in to continue.",
    };
  }
}

export async function withdrawLoanApplication(
  applicationId: string,
): Promise<LoanApplicationWithdrawResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("withdraw_loan_application", {
      p_application_id: applicationId,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          application?: Json;
        }
      | null;

    if (error || !result?.ok || !isLoanApplicationRow(result.application)) {
      return {
        ok: false,
        message: result?.message ?? "Could not withdraw application.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath(`/lender/applications/${applicationId}`);

    return {
      ok: true,
      application: mapLoanApplicationRow(result.application),
      message: result.message ?? "Application withdrawn.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not withdraw application.",
    };
  }
}

export async function acceptLoanOffer(
  offerId: string,
): Promise<LoanOfferAcceptResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("accept_loan_offer", {
      p_offer_id: offerId,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          loan_application_id?: string;
          active_loan_id?: string;
        }
      | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message: result?.message ?? "Could not accept offer.",
      };
    }

    revalidatePath("/borrower");
    if (result.loan_application_id) {
      revalidatePath(`/lender/applications/${result.loan_application_id}`);
    }

    return {
      ok: true,
      message: result.message ?? "Offer accepted.",
      activeLoanId: result.active_loan_id ?? null,
    };
  } catch {
    return {
      ok: false,
      message: "Could not accept offer.",
    };
  }
}

export async function declineLoanOffer(
  offerId: string,
): Promise<LoanOfferDeclineResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const { data, error } = await supabase.rpc("decline_loan_offer", {
      p_offer_id: offerId,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          loan_application_id?: string;
        }
      | null;

    if (error || !result?.ok) {
      return {
        ok: false,
        message: result?.message ?? "Could not decline offer.",
      };
    }

    revalidatePath("/borrower");
    if (result.loan_application_id) {
      revalidatePath(`/lender/applications/${result.loan_application_id}`);
    }

    return {
      ok: true,
      message: result.message ?? "Offer declined.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not decline offer.",
    };
  }
}

export async function submitRepaymentProof(
  repaymentScheduleId: string,
  formData: FormData,
): Promise<RepaymentProofSubmitResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const proofFile = formData.get("proofFile");

    if (!(proofFile instanceof File) || proofFile.size === 0) {
      return {
        ok: false,
        message: "Choose a proof file to upload.",
      };
    }

    if (!repaymentProofAllowedTypes.has(proofFile.type)) {
      return {
        ok: false,
        message: "Upload a JPG, PNG, WebP, or PDF file.",
      };
    }

    if (proofFile.size > repaymentProofMaxFileSize) {
      return {
        ok: false,
        message: "Upload a file up to 5 MB.",
      };
    }

    const { data: repayment, error: repaymentError } = await supabase
      .from("loan_repayment_schedules")
      .select("id, active_loan_id, borrower_id, lender_id, status")
      .eq("id", repaymentScheduleId)
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (repaymentError || !repayment) {
      return {
        ok: false,
        message: "Could not find this repayment.",
      };
    }

    if (repayment.status === "verified") {
      return {
        ok: false,
        message: "This repayment is already verified.",
      };
    }

    if (repayment.status === "submitted") {
      return {
        ok: false,
        message: "A proof is already waiting for lender review.",
      };
    }

    const { data: activeLoan, error: activeLoanError } = await supabase
      .from("active_loans")
      .select("id, status")
      .eq("id", repayment.active_loan_id)
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (
      activeLoanError ||
      !activeLoan ||
      !["active", "overdue"].includes(activeLoan.status)
    ) {
      return {
        ok: false,
        message: "This loan is not active.",
      };
    }

    const safeFileName = createSafeProofFileName(proofFile.name);
    const storagePath = [
      "borrowers",
      access.profile.id,
      "loans",
      repayment.active_loan_id,
      "repayments",
      repayment.id,
      `${Date.now()}-${safeFileName}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(repaymentProofBucket)
      .upload(storagePath, proofFile, {
        contentType: proofFile.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        ok: false,
        message: "Could not upload proof.",
      };
    }

    const { data, error } = await supabase.rpc("submit_repayment_proof", {
      p_repayment_schedule_id: repayment.id,
      p_storage_path: storagePath,
      p_file_name: proofFile.name,
      p_file_type: proofFile.type,
      p_file_size: proofFile.size,
    });

    const result = data as
      | {
          ok?: boolean;
          message?: string;
          proof_id?: string;
        }
      | null;

    if (error || !result?.ok || !result.proof_id) {
      await supabase.storage.from(repaymentProofBucket).remove([storagePath]);

      return {
        ok: false,
        message: result?.message ?? "Could not submit proof.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath("/lender");
    revalidatePath("/lender/applications");

    return {
      ok: true,
      message: result.message ?? "Proof submitted for lender review.",
      proofId: result.proof_id,
    };
  } catch {
    return {
      ok: false,
      message: "Could not submit proof.",
    };
  }
}

function isLoanApplicationRow(value: Json | undefined): value is Parameters<
  typeof mapLoanApplicationRow
>[0] {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "id" in value &&
      "borrower_id" in value &&
      "borrower_portfolio_id" in value &&
      "requested_amount" in value &&
      "purpose" in value &&
      "preferred_term" in value &&
      "status" in value &&
      "submitted_at" in value,
  );
}

function createSafeProofFileName(fileName: string) {
  const fallbackName = "repayment-proof";
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  return normalized || fallbackName;
}

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
  evaluateBorrowerReadiness,
  type BorrowerReadinessResult,
} from "@/lib/borrower-readiness";
import {
  buildConsentStatus,
  getRequiredConsentVersions,
  hasCurrentRequiredConsents,
  type ConsentStatus,
  type UserConsentRecord,
} from "@/lib/consents";
import {
  borrowerVerificationDocumentAllowedTypes,
  borrowerVerificationDocumentBucket,
  borrowerVerificationDocumentMaxFileSize,
  createSafeUploadFileName,
  getBorrowerVerificationMessage,
  getBorrowerVerificationStatus,
  isBorrowerVerificationDocumentType,
  type BorrowerVerificationSummary,
} from "@/lib/borrower-verification";
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
        | "readiness"
        | "borrower-verification"
        | "consent-required"
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
      borrowerVerification: BorrowerVerificationSummary;
      creditSummary: BorrowerCreditSummary | null;
      readiness: BorrowerReadinessResult | null;
      consentStatuses: {
        borrowerDocumentUpload: ConsentStatus;
        borrowerLoanApplication: ConsentStatus;
      };
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "supabase";
      applications: BorrowerLoanApplicationSummary[];
      hasPortfolio: boolean;
      borrowerVerification: BorrowerVerificationSummary | null;
      creditSummary: BorrowerCreditSummary | null;
      readiness: BorrowerReadinessResult | null;
      consentStatuses: {
        borrowerDocumentUpload: ConsentStatus;
        borrowerLoanApplication: ConsentStatus;
      } | null;
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

export type BorrowerVerificationDocumentSubmitResult =
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

const repaymentProofBucket = "repayment-proofs";
const repaymentProofMaxFileSize = 5 * 1024 * 1024;
const repaymentProofAllowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const borrowerPortfolioCreditSelect =
  "id, borrower_id, business_name, business_description, business_type, started_operating_at, business_address, barangay, city_or_municipality, province, location, operating_model, primary_sales_channel, revenue_period, revenue_confidence, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, expense_breakdown, debt_obligation_summary, loan_purpose_context, profile_last_confirmed_at, profile_review_status, created_at, updated_at";

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
        "id, borrower_id, business_name, business_description, business_type, started_operating_at, business_address, barangay, city_or_municipality, province, location, operating_model, primary_sales_channel, revenue_period, revenue_confidence, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, expense_breakdown, debt_obligation_summary, loan_purpose_context, profile_last_confirmed_at, profile_review_status, created_at, updated_at",
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
        business_name: parsed.data.businessName,
        business_type: parsed.data.businessType,
        location: parsed.data.location,
        revenue_period: "last_30_days",
        revenue_confidence: "self_declared",
        monthly_gross_revenue: parsed.data.monthlyGrossRevenue,
        monthly_expenses: parsed.data.monthlyExpenses,
        existing_loan_payments: parsed.data.existingLoanPayments,
        years_in_operation: parsed.data.yearsInOperation,
        loan_purpose_context: parsed.data.loanPurposeContext,
        profile_last_confirmed_at: new Date().toISOString(),
        profile_review_status: "self_declared",
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

    revalidatePath("/borrower");

    return {
      ok: true,
      mode: "supabase",
      message: "Profile saved. Next, verify your borrower profile by uploading a valid ID and business proof.",
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
        borrowerVerification: null,
        creditSummary: null,
        readiness: null,
        consentStatuses: null,
        message: access.message,
      };
    }

    const userConsents = await loadUserConsents(supabase, access.profile.id);
    const consentStatuses = {
      borrowerDocumentUpload: buildConsentStatus(
        "borrower_document_upload",
        userConsents,
      ),
      borrowerLoanApplication: buildConsentStatus(
        "borrower_loan_application",
        userConsents,
      ),
    };
    const borrowerVerification = await getBorrowerVerificationStatus(
      supabase,
      access.profile.id,
    );

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
        borrowerVerification,
        creditSummary: null,
        readiness: null,
        consentStatuses,
        message: "Could not confirm your profile.",
      };
    }

    const creditSummary = portfolio
      ? await loadBorrowerCreditSummary(access.profile.id, portfolio, supabase)
      : null;
    const readiness = evaluateBorrowerReadiness(
      portfolio ? mapBorrowerPortfolioRow(portfolio) : null,
      {
        accountStatus: access.profile.status,
        borrowerVerification,
        loanApplicationConsent: consentStatuses.borrowerLoanApplication,
        creditSummary,
      },
    );

    const { data, error } = await supabase
      .from("loan_applications")
      .select(
        "id, borrower_id, borrower_portfolio_id, requested_amount, credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission, monthly_net_cash_flow_at_submission, credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at",
      )
      .eq("borrower_id", access.profile.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        borrowerVerification,
        creditSummary,
        readiness,
        consentStatuses,
        message: "Could not load applications.",
      };
    }

    if (data.length === 0) {
      return {
        ok: true,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        borrowerVerification,
        creditSummary,
        readiness,
        consentStatuses,
        message: portfolio
          ? getBorrowerVerificationMessage(borrowerVerification)
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
        borrowerVerification,
        creditSummary,
        readiness,
        consentStatuses,
        message: "Could not load offers.",
      };
    }

    if (!activeLoansResult.ok) {
      return {
        ok: false,
        mode: activeLoansResult.mode,
        applications: [],
        hasPortfolio: Boolean(portfolio),
        borrowerVerification,
        creditSummary,
        readiness,
        consentStatuses,
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
      borrowerVerification,
      creditSummary,
      readiness,
      consentStatuses,
      message: portfolio
        ? getBorrowerVerificationMessage(borrowerVerification)
        : "Save your business profile before submitting an application.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      applications: [],
      hasPortfolio: false,
      borrowerVerification: null,
      creditSummary: null,
      readiness: null,
      consentStatuses: null,
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
          result?.code === "missing_portfolio" ||
          result?.code === "profile_required" ||
          result?.code === "profile_incomplete"
            ? "missing-portfolio"
            : result?.code === "consent_required"
              ? "consent-required"
            : result?.code === "borrower_verification_required"
              || result?.code === "documents_required"
              ? "borrower-verification"
            : result?.code === "account_not_active" ||
                result?.code === "suspended"
              ? "auth"
            : result?.code === "credit_limit_exceeded"
              ? "credit-limit"
            : result?.code === "profile_needs_review" ||
                result?.code === "profile_stale" ||
                result?.code === "not_eligible"
              ? "readiness"
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
  _previousState: RepaymentProofSubmitResult | null,
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

    const repaymentScheduleId = formData.get("repaymentScheduleId");

    if (typeof repaymentScheduleId !== "string" || repaymentScheduleId.length === 0) {
      return {
        ok: false,
        message: "Missing repayment reference.",
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
        message: "Upload a JPG, PNG, WebP, HEIC, or PDF file.",
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

export async function submitBorrowerVerificationDocument(
  _previousState: BorrowerVerificationDocumentSubmitResult | null,
  formData: FormData,
): Promise<BorrowerVerificationDocumentSubmitResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireBorrower(supabase);

    if (!access.ok) {
      return {
        ok: false,
        message: access.message,
      };
    }

    const userConsents = await loadUserConsents(supabase, access.profile.id);

    if (
      !hasCurrentRequiredConsents(
        userConsents,
        getRequiredConsentVersions("borrower_document_upload"),
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
    const documentFile =
      formData.get("documentFile") ?? formData.get("proofFile");

    if (!isBorrowerVerificationDocumentType(documentType)) {
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

    if (!borrowerVerificationDocumentAllowedTypes.has(documentFile.type)) {
      return {
        ok: false,
        message: "Upload a JPG, PNG, WebP, or PDF file.",
      };
    }

    if (documentFile.size > borrowerVerificationDocumentMaxFileSize) {
      return {
        ok: false,
        message: "Upload a file up to 5 MB.",
      };
    }

    const { data: verification, error: verificationError } = await supabase
      .from("borrower_verifications")
      .select("id, borrower_id, verification_status")
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (verificationError || !verification) {
      return {
        ok: false,
        message: "Borrower verification is unavailable.",
      };
    }

    if (verification.verification_status === "approved") {
      return {
        ok: false,
        message: "This borrower verification is already approved.",
      };
    }

    if (
      ![
        "not_started",
        "pending",
        "pending_documents",
        "rejected",
        "needs_resubmission",
      ].includes(verification.verification_status)
    ) {
      return {
        ok: false,
        message: "Could not upload verification document.",
      };
    }

    const safeFileName = createSafeUploadFileName(
      documentFile.name,
      "verification-document",
    );
    const storagePath = [
      "borrowers",
      access.profile.id,
      "verification",
      verification.id,
      `${Date.now()}-${safeFileName}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(borrowerVerificationDocumentBucket)
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
      "submit_borrower_verification_document",
      {
        p_borrower_verification_id: verification.id,
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
        .from(borrowerVerificationDocumentBucket)
        .remove([storagePath]);

      return {
        ok: false,
        code:
          result?.code === "consent_required" ? "consent_required" : undefined,
        message: result?.message ?? "Could not save verification document.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath("/manager");
    revalidatePath("/manager/borrower-verifications");

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
  return createSafeUploadFileName(fileName, "repayment-proof");
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

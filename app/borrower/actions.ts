"use server";

import { revalidatePath } from "next/cache";
import { requireBorrower } from "@/lib/access-control";
import {
  borrowerPortfolioSchema,
  mapBorrowerPortfolioRow,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import {
  loanApplicationSchema,
  mapLoanApplicationRow,
  type LoanApplicationInput,
  type LoanApplicationSummary,
} from "@/lib/loan-application";
import { mapLoanOfferRow, type LoanOfferSummary } from "@/lib/loan-offer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BorrowerLoanApplicationSummary = LoanApplicationSummary & {
  offers: LoanOfferSummary[];
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
      mode: "auth" | "validation" | "missing-portfolio" | "supabase";
      message: string;
      fieldErrors?: Partial<Record<keyof LoanApplicationInput, string[]>>;
    };

export type LoanApplicationsLoadResult =
  | {
      ok: true;
      mode: "supabase";
      applications: BorrowerLoanApplicationSummary[];
      hasPortfolio: boolean;
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "supabase";
      applications: BorrowerLoanApplicationSummary[];
      hasPortfolio: boolean;
      message: string;
    };

export type LoanOfferAcceptResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

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
        message: access.message,
      };
    }

    const { data: portfolio, error: portfolioError } = await supabase
      .from("borrower_portfolios")
      .select("id")
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (portfolioError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: false,
        message: "Could not confirm your profile.",
      };
    }

    const { data, error } = await supabase
      .from("loan_applications")
      .select(
        "id, borrower_id, borrower_portfolio_id, requested_amount, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at",
      )
      .eq("borrower_id", access.profile.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        message: "Could not load applications.",
      };
    }

    if (data.length === 0) {
      return {
        ok: true,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        message: portfolio
          ? "Applications loaded."
          : "Save your business profile before submitting an application.",
      };
    }

    const applicationIds = data.map((application) => application.id);
    const { data: offers, error: offersError } = await supabase
      .from("loan_offers")
      .select(
        "id, loan_application_id, borrower_id, lender_id, lender_name, approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at, created_at, updated_at",
      )
      .in("loan_application_id", applicationIds)
      .order("sent_at", { ascending: false });

    if (offersError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        message: "Could not load offers.",
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

    return {
      ok: true,
      mode: "supabase",
      applications: data.map((application) => {
        const mappedApplication = mapLoanApplicationRow(application);

        return {
          ...mappedApplication,
          offers: offersByApplicationId.get(mappedApplication.id) ?? [],
        };
      }),
      hasPortfolio: Boolean(portfolio),
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
      message: "Sign in to continue.",
    };
  }
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

    const { data: portfolio, error: portfolioError } = await supabase
      .from("borrower_portfolios")
      .select("id")
      .eq("borrower_id", access.profile.id)
      .maybeSingle();

    if (portfolioError) {
      return {
        ok: false,
        mode: "supabase",
        message: "Could not confirm your profile.",
      };
    }

    if (!portfolio) {
      return {
        ok: false,
        mode: "missing-portfolio",
        message: "Save your business profile before submitting an application.",
      };
    }

    const { data, error } = await supabase
      .from("loan_applications")
      .insert({
        borrower_id: access.profile.id,
        borrower_portfolio_id: portfolio.id,
        requested_amount: parsed.data.requestedAmount,
        purpose: parsed.data.purpose,
        preferred_term: parsed.data.preferredTerm,
        remarks: parsed.data.remarks || null,
        status: "submitted",
      })
      .select(
        "id, borrower_id, borrower_portfolio_id, requested_amount, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at",
      )
      .single();

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        message: "Could not submit application.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      application: mapLoanApplicationRow(data),
      message: "Application submitted.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      message: "Sign in to continue.",
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
    };
  } catch {
    return {
      ok: false,
      message: "Could not accept offer.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
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
      mode: "local-placeholder" | "validation" | "supabase";
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
      mode: "local-placeholder" | "supabase";
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
        | "local-placeholder"
        | "validation"
        | "missing-portfolio"
        | "supabase";
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
      mode: "local-placeholder" | "supabase";
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        mode: "local-placeholder",
        data: null,
        message:
          "No Supabase borrower session yet. The form can use a device draft for now.",
      };
    }

    const { data, error } = await supabase
      .from("borrower_portfolios")
      .select(
        "id, borrower_id, business_type, location, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, loan_purpose_context, created_at, updated_at",
      )
      .eq("borrower_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        data: null,
        message:
          "Could not load the Supabase portfolio. Confirm the borrower_portfolios migration and RLS policies.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      data: data ? mapBorrowerPortfolioRow(data) : null,
      message: data
        ? "Loaded your saved Supabase portfolio."
        : "No saved Supabase portfolio yet.",
    };
  } catch {
    return {
      ok: false,
      mode: "local-placeholder",
      data: null,
      message:
        "Supabase is not configured yet. The form can use a device draft for now.",
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        mode: "local-placeholder",
        message:
          "Saved as a device draft. Supabase save needs borrower authentication.",
      };
    }

    const { error } = await supabase.from("borrower_portfolios").upsert(
      {
        borrower_id: user.id,
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
        message:
          "Saved as a device draft. Supabase rejected the portfolio write; confirm the borrower_portfolios table and RLS policies.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      message: "Portfolio saved to Supabase.",
    };
  } catch {
    return {
      ok: false,
      mode: "local-placeholder",
      message:
        "Saved as a device draft. Supabase environment variables or schema are not configured yet.",
    };
  }
}

export async function loadBorrowerLoanApplications(): Promise<LoanApplicationsLoadResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        mode: "local-placeholder",
        applications: [],
        hasPortfolio: false,
        message:
          "No Supabase borrower session yet. Submitted demo applications can be kept on this device.",
      };
    }

    const { data: portfolio, error: portfolioError } = await supabase
      .from("borrower_portfolios")
      .select("id")
      .eq("borrower_id", user.id)
      .maybeSingle();

    if (portfolioError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: false,
        message:
          "Could not confirm the saved portfolio. Confirm the borrower_portfolios migration and RLS policies.",
      };
    }

    const { data, error } = await supabase
      .from("loan_applications")
      .select(
        "id, borrower_id, borrower_portfolio_id, requested_amount, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at",
      )
      .eq("borrower_id", user.id)
      .order("submitted_at", { ascending: false });

    if (error) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        message:
          "Could not load loan applications. Confirm the loan_applications migration and RLS policies.",
      };
    }

    if (data.length === 0) {
      return {
        ok: true,
        mode: "supabase",
        applications: [],
        hasPortfolio: Boolean(portfolio),
        message: portfolio
          ? "Loaded submitted Supabase loan applications."
          : "Create and save a borrower portfolio before submitting a loan application.",
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
        message:
          "Could not load offers. Confirm the loan_offers migration and RLS policies.",
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
        ? "Loaded submitted Supabase loan applications."
        : "Create and save a borrower portfolio before submitting a loan application.",
    };
  } catch {
    return {
      ok: false,
      mode: "local-placeholder",
      applications: [],
      hasPortfolio: false,
      message:
        "Supabase is not configured yet. Submitted demo applications can be kept on this device.",
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        mode: "local-placeholder",
        message:
          "Saved as a device demo application. Supabase submission needs borrower authentication.",
      };
    }

    const { data: portfolio, error: portfolioError } = await supabase
      .from("borrower_portfolios")
      .select("id")
      .eq("borrower_id", user.id)
      .maybeSingle();

    if (portfolioError) {
      return {
        ok: false,
        mode: "supabase",
        message:
          "Could not confirm the saved borrower portfolio. Confirm the borrower_portfolios migration and RLS policies.",
      };
    }

    if (!portfolio) {
      return {
        ok: false,
        mode: "missing-portfolio",
        message: "Save a borrower portfolio before submitting a loan application.",
      };
    }

    const { data, error } = await supabase
      .from("loan_applications")
      .insert({
        borrower_id: user.id,
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
        message:
          "Supabase rejected the loan application. Confirm the loan_applications table and RLS policies.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      application: mapLoanApplicationRow(data),
      message: "Loan application submitted to Supabase.",
    };
  } catch {
    return {
      ok: false,
      mode: "local-placeholder",
      message:
        "Saved as a device demo application. Supabase environment variables or schema are not configured yet.",
    };
  }
}

export async function acceptLoanOffer(
  offerId: string,
): Promise<LoanOfferAcceptResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        message: "Sign in with the borrower demo account before accepting an offer.",
      };
    }

    const { data: offer, error: offerError } = await supabase
      .from("loan_offers")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .eq("borrower_id", user.id)
      .eq("status", "pending")
      .select("id, loan_application_id")
      .maybeSingle();

    if (offerError || !offer) {
      return {
        ok: false,
        message:
          "Could not accept this offer. Confirm it is still pending and belongs to this borrower.",
      };
    }

    const { error: declineError } = await supabase
      .from("loan_offers")
      .update({
        status: "declined",
        updated_at: new Date().toISOString(),
      })
      .eq("loan_application_id", offer.loan_application_id)
      .eq("borrower_id", user.id)
      .eq("status", "pending")
      .neq("id", offer.id);

    if (declineError) {
      return {
        ok: false,
        message:
          "Accepted the selected offer, but could not close the other pending offers for this application.",
      };
    }

    revalidatePath("/borrower");
    revalidatePath(`/lender/applications/${offer.loan_application_id}`);

    return {
      ok: true,
      message: "Offer accepted. Other pending offers for this application were declined.",
    };
  } catch {
    return {
      ok: false,
      message:
        "Supabase is not configured yet. Offer acceptance needs the ADI-13 schema and borrower demo sign-in.",
    };
  }
}

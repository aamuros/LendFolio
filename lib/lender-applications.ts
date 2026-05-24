import {
  businessTypeLabels,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import {
  mapLoanApplicationRow,
  preferredTermLabels,
  type LoanApplicationSummary,
} from "@/lib/loan-application";
import { mapLoanOfferRow, type LoanOfferSummary } from "@/lib/loan-offer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];

export type LenderApplicationReview = LoanApplicationSummary & {
  borrowerId: string;
  portfolio: BorrowerPortfolioInput & {
    businessTypeLabel: string;
  };
  financialIndicators: {
    estimatedNetMonthlyRevenue: number;
    monthlyCashAfterLoanPayments: number;
  };
  offers: LoanOfferSummary[];
};

export type LenderApplicationsLoadResult =
  | {
      ok: true;
      mode: "supabase";
      applications: LenderApplicationReview[];
      message: string;
    }
  | {
      ok: false;
      mode: "local-placeholder" | "supabase";
      applications: LenderApplicationReview[];
      message: string;
    };

export type LenderApplicationDetailResult =
  | {
      ok: true;
      mode: "supabase";
      application: LenderApplicationReview;
      message: string;
    }
  | {
      ok: false;
      mode: "local-placeholder" | "not-found" | "supabase";
      application: null;
      message: string;
    };

const lenderReviewApplicationSelect =
  "id, borrower_id, borrower_portfolio_id, requested_amount, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at";

const lenderReviewPortfolioSelect =
  "id, borrower_id, business_type, location, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, loan_purpose_context, created_at, updated_at";

const lenderReviewOfferSelect =
  "id, loan_application_id, borrower_id, lender_id, lender_name, approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at, created_at, updated_at";

export async function loadOpenLenderApplications(): Promise<LenderApplicationsLoadResult> {
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
        message:
          "No Supabase lender session yet. Sign in with the lender demo account to review submitted applications.",
      };
    }

    const { data: applications, error: applicationsError } = await supabase
      .from("loan_applications")
      .select(lenderReviewApplicationSelect)
      .in("status", ["submitted", "open"])
      .order("submitted_at", { ascending: false });

    if (applicationsError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        message:
          "Could not load submitted applications. Confirm the loan_applications table and lender demo RLS policies.",
      };
    }

    if (applications.length === 0) {
      return {
        ok: true,
        mode: "supabase",
        applications: [],
        message: "No submitted or open applications are ready for lender review.",
      };
    }

    const profileIds = [
      ...new Set(applications.map((application) => application.borrower_portfolio_id)),
    ];
    const { data: portfolios, error: portfoliosError } = await supabase
      .from("borrower_portfolios")
      .select(lenderReviewPortfolioSelect)
      .in("id", profileIds);

    if (portfoliosError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        message:
          "Could not load borrower portfolio review fields. Confirm the borrower_portfolios lender review RLS policy.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      applications: combineApplicationsWithPortfolios(applications, portfolios),
      message: "Loaded submitted and open applications for lender review.",
    };
  } catch {
    return {
      ok: false,
      mode: "local-placeholder",
      applications: [],
      message:
        "Supabase is not configured yet. Lender application browsing needs the Sprint 1 Supabase schema and demo sign-in.",
    };
  }
}

export async function loadLenderApplicationDetail(
  applicationId: string,
): Promise<LenderApplicationDetailResult> {
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
        application: null,
        message:
          "No Supabase lender session yet. Sign in with the lender demo account to review this application.",
      };
    }

    const { data: application, error: applicationError } = await supabase
      .from("loan_applications")
      .select(lenderReviewApplicationSelect)
      .eq("id", applicationId)
      .in("status", ["submitted", "open"])
      .maybeSingle();

    if (applicationError) {
      return {
        ok: false,
        mode: "supabase",
        application: null,
        message:
          "Could not load this application. Confirm the loan_applications table and lender demo RLS policies.",
      };
    }

    if (!application) {
      return {
        ok: false,
        mode: "not-found",
        application: null,
        message: "This application is not open for lender review.",
      };
    }

    const { data: portfolio, error: portfolioError } = await supabase
      .from("borrower_portfolios")
      .select(lenderReviewPortfolioSelect)
      .eq("id", application.borrower_portfolio_id)
      .maybeSingle();

    if (portfolioError || !portfolio) {
      return {
        ok: false,
        mode: "supabase",
        application: null,
        message:
          "Could not load borrower portfolio review fields. Confirm the borrower_portfolios lender review RLS policy.",
      };
    }

    const { data: offers, error: offersError } = await supabase
      .from("loan_offers")
      .select(lenderReviewOfferSelect)
      .eq("loan_application_id", application.id)
      .order("sent_at", { ascending: false });

    if (offersError) {
      return {
        ok: false,
        mode: "supabase",
        application: null,
        message:
          "Could not load existing offers. Confirm the loan_offers table and RLS policies.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      application: toLenderApplicationReview(application, portfolio, offers),
      message: "Loaded application detail for lender review.",
    };
  } catch {
    return {
      ok: false,
      mode: "local-placeholder",
      application: null,
      message:
        "Supabase is not configured yet. Application detail review needs the Sprint 1 Supabase schema and demo sign-in.",
    };
  }
}

export function formatPreferredTerm(
  term: LenderApplicationReview["preferredTerm"],
) {
  return preferredTermLabels[term];
}

function combineApplicationsWithPortfolios(
  applications: Database["public"]["Tables"]["loan_applications"]["Row"][],
  portfolios: BorrowerPortfolioRow[],
) {
  const portfoliosById = new Map(
    portfolios.map((portfolio) => [portfolio.id, portfolio]),
  );

  return applications.flatMap((application) => {
    const portfolio = portfoliosById.get(application.borrower_portfolio_id);

    if (!portfolio) {
      return [];
    }

    return [toLenderApplicationReview(application, portfolio)];
  });
}

function toLenderApplicationReview(
  application: Database["public"]["Tables"]["loan_applications"]["Row"],
  portfolio: BorrowerPortfolioRow,
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][] = [],
): LenderApplicationReview {
  const mappedApplication = mapLoanApplicationRow(application);
  const estimatedNetMonthlyRevenue =
    portfolio.monthly_gross_revenue - portfolio.monthly_expenses;

  return {
    ...mappedApplication,
    borrowerId: application.borrower_id,
    portfolio: {
      businessType: portfolio.business_type,
      businessTypeLabel: businessTypeLabels[portfolio.business_type],
      location: portfolio.location,
      monthlyGrossRevenue: portfolio.monthly_gross_revenue,
      monthlyExpenses: portfolio.monthly_expenses,
      existingLoanPayments: portfolio.existing_loan_payments,
      yearsInOperation: portfolio.years_in_operation,
      loanPurposeContext: portfolio.loan_purpose_context,
    },
    financialIndicators: {
      estimatedNetMonthlyRevenue,
      monthlyCashAfterLoanPayments:
        estimatedNetMonthlyRevenue - portfolio.existing_loan_payments,
    },
    offers: offers.map(mapLoanOfferRow),
  };
}

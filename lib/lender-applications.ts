import {
  businessTypeLabels,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import { requireApprovedLender } from "@/lib/access-control";
import {
  mapLoanApplicationRow,
  preferredTermLabels,
  type LoanApplicationSummary,
} from "@/lib/loan-application";
import { mapLoanOfferRow, type LoanOfferSummary } from "@/lib/loan-offer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { openApplicationStatuses } from "@/lib/workflow-rules";

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

export type LenderOfferReview = LoanOfferSummary & {
  application: {
    id: string;
    status: LoanApplicationSummary["status"];
    requestedAmount: number;
    purpose: string;
    portfolio: {
      businessTypeLabel: string;
      location: string;
    } | null;
  } | null;
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
      mode: "auth" | "supabase";
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
      mode: "auth" | "not-found" | "supabase";
      application: null;
      message: string;
    };

export type LenderOffersLoadResult =
  | {
      ok: true;
      mode: "supabase";
      offers: LenderOfferReview[];
      message: string;
    }
  | {
      ok: false;
      mode: "auth" | "supabase";
      offers: LenderOfferReview[];
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
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        applications: [],
        message: access.message,
      };
    }

    const { data: applications, error: applicationsError } = await supabase
      .from("loan_applications")
      .select(lenderReviewApplicationSelect)
      .in("status", [...openApplicationStatuses])
      .order("submitted_at", { ascending: false });

    if (applicationsError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        message: "Could not load applications.",
      };
    }

    if (applications.length === 0) {
      return {
        ok: true,
        mode: "supabase",
        applications: [],
        message: "No open applications.",
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
        message: "Could not load application details.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      applications: combineApplicationsWithPortfolios(applications, portfolios),
      message: "Applications loaded.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      applications: [],
      message: "Sign in to continue.",
    };
  }
}

export async function loadLenderApplicationDetail(
  applicationId: string,
): Promise<LenderApplicationDetailResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        application: null,
        message: access.message,
      };
    }

    const { data: application, error: applicationError } = await supabase
      .from("loan_applications")
      .select(lenderReviewApplicationSelect)
      .eq("id", applicationId)
      .in("status", [...openApplicationStatuses])
      .maybeSingle();

    if (applicationError) {
      return {
        ok: false,
        mode: "supabase",
        application: null,
        message: "Could not load this application.",
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
        message: "Could not load borrower profile.",
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
        message: "Could not load offers.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      application: toLenderApplicationReview(application, portfolio, offers),
      message: "Application loaded.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      application: null,
      message: "Sign in to continue.",
    };
  }
}

export async function loadLenderOffers(): Promise<LenderOffersLoadResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await requireApprovedLender(supabase);

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        offers: [],
        message: access.message,
      };
    }

    const { data: offers, error: offersError } = await supabase
      .from("loan_offers")
      .select(lenderReviewOfferSelect)
      .eq("lender_id", access.profile.id)
      .order("sent_at", { ascending: false });

    if (offersError) {
      return {
        ok: false,
        mode: "supabase",
        offers: [],
        message: "Could not load offers.",
      };
    }

    if (offers.length === 0) {
      return {
        ok: true,
        mode: "supabase",
        offers: [],
        message: "No sent offers.",
      };
    }

    const applicationIds = [
      ...new Set(offers.map((offer) => offer.loan_application_id)),
    ];
    const { data: applications, error: applicationsError } = await supabase
      .from("loan_applications")
      .select(lenderReviewApplicationSelect)
      .in("id", applicationIds);

    if (applicationsError) {
      return {
        ok: false,
        mode: "supabase",
        offers: [],
        message: "Could not load offer details.",
      };
    }

    const portfolioIds = [
      ...new Set(applications.map((application) => application.borrower_portfolio_id)),
    ];
    const { data: portfolios, error: portfoliosError } = await supabase
      .from("borrower_portfolios")
      .select(lenderReviewPortfolioSelect)
      .in("id", portfolioIds);

    if (portfoliosError) {
      return {
        ok: false,
        mode: "supabase",
        offers: [],
        message: "Could not load offer context.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      offers: combineOffersWithApplications(offers, applications, portfolios),
      message: "Offers loaded.",
    };
  } catch {
    return {
      ok: false,
      mode: "auth",
      offers: [],
      message: "Sign in to continue.",
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

function combineOffersWithApplications(
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][],
  applications: Database["public"]["Tables"]["loan_applications"]["Row"][],
  portfolios: BorrowerPortfolioRow[],
) {
  const applicationsById = new Map(
    applications.map((application) => [application.id, application]),
  );
  const portfoliosById = new Map(
    portfolios.map((portfolio) => [portfolio.id, portfolio]),
  );

  return offers.map((offer) => {
    const mappedOffer = mapLoanOfferRow(offer);
    const application = applicationsById.get(offer.loan_application_id);

    if (!application) {
      return {
        ...mappedOffer,
        application: null,
      };
    }

    const portfolio = portfoliosById.get(application.borrower_portfolio_id);
    const mappedApplication = mapLoanApplicationRow(application);

    return {
      ...mappedOffer,
      application: {
        id: application.id,
        status: mappedApplication.status,
        requestedAmount: mappedApplication.requestedAmount,
        purpose: mappedApplication.purpose,
        portfolio: portfolio
          ? {
              businessTypeLabel: businessTypeLabels[portfolio.business_type],
              location: portfolio.location,
            }
          : null,
      },
    };
  });
}

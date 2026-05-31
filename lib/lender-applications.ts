import { businessTypeLabels } from "@/lib/borrower-portfolio";
import { requireApprovedLender } from "@/lib/access-control";
import {
  loadLenderActiveLoans,
  type ActiveLoanSummary,
} from "@/lib/active-loans";
import {
  mapLoanApplicationRow,
  preferredTermLabels,
  type LoanApplicationSummary,
} from "@/lib/loan-application";
import { mapLoanOfferRow, type LoanOfferSummary } from "@/lib/loan-offer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { openApplicationStatuses } from "@/lib/workflow-rules";

type ApprovedLenderAccess = Extract<
  Awaited<ReturnType<typeof requireApprovedLender>>,
  { ok: true }
>;

type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];
type SupabaseServerClient = ApprovedLenderAccess["supabase"];

export type LenderApplicationReview = LoanApplicationSummary & {
  borrowerId: string;
  currentLenderOfferState:
    | "not_offered"
    | "offer_pending"
    | "offer_accepted"
    | "offer_declined"
    | "offer_expired";
  hasAcceptedOffer: boolean;
  portfolio: {
    businessType: BorrowerPortfolioRow["business_type"];
    businessTypeLabel: string;
    location: string;
    monthlyGrossRevenue: number;
    monthlyExpenses: number;
    existingLoanPayments: number;
    yearsInOperation: number;
    loanPurposeContext: string;
  };
  financialIndicators: {
    estimatedNetMonthlyRevenue: number;
    monthlyCashAfterLoanPayments: number;
  };
  offers: LoanOfferSummary[];
};

export type LenderOfferReview = LoanOfferSummary & {
  activeLoan: ActiveLoanSummary | null;
  application: {
    id: string;
    status: LoanApplicationSummary["status"];
    requestedAmount: number;
    purpose: string;
    submittedAt: string;
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
  "id, borrower_id, borrower_portfolio_id, requested_amount, credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission, monthly_net_cash_flow_at_submission, credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot, purpose, preferred_term, remarks, status, submitted_at, created_at, updated_at";

const lenderReviewPortfolioSelect =
  "id, borrower_id, business_name, business_description, business_type, started_operating_at, business_address, barangay, city_or_municipality, province, location, operating_model, primary_sales_channel, revenue_period, revenue_confidence, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, expense_breakdown, debt_obligation_summary, loan_purpose_context, profile_last_confirmed_at, profile_review_status, created_at, updated_at";

const lenderReviewOfferSelect =
  "id, loan_application_id, borrower_id, lender_id, lender_name, approved_amount, repayment_amount, fees, due_date, remarks, status, sent_at, created_at, updated_at";

export async function loadOpenLenderApplications(
  verifiedAccess?: ApprovedLenderAccess,
): Promise<LenderApplicationsLoadResult> {
  try {
    const supabase =
      verifiedAccess?.supabase ?? (await createSupabaseServerClient());
    const access = verifiedAccess ?? (await requireApprovedLender(supabase));

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

    const applicationIds = applications.map((application) => application.id);
    const profileIds = [
      ...new Set(applications.map((application) => application.borrower_portfolio_id)),
    ];
    const { data: lenderOffers, error: lenderOffersError } = await supabase
      .from("loan_offers")
      .select(lenderReviewOfferSelect)
      .eq("lender_id", access.profile.id)
      .in("loan_application_id", applicationIds);

    if (lenderOffersError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        message: "Could not load lender offer state.",
      };
    }

    const [portfoliosResult, offerFlagsResult] = await Promise.all([
      supabase
        .from("borrower_portfolios")
        .select(lenderReviewPortfolioSelect)
        .in("id", profileIds),
      loadAcceptedOfferFlags(supabase, applicationIds),
    ]);
    const { data: portfolios, error: portfoliosError } = portfoliosResult;

    if (portfoliosError) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        message: "Could not load application details.",
      };
    }

    if (!offerFlagsResult.ok) {
      return {
        ok: false,
        mode: "supabase",
        applications: [],
        message: "Could not load offer availability.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      applications: combineApplicationsWithPortfolios(
        applications,
        portfolios,
        lenderOffers,
        offerFlagsResult.flags,
      ),
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
  verifiedAccess?: ApprovedLenderAccess,
): Promise<LenderApplicationDetailResult> {
  try {
    const supabase =
      verifiedAccess?.supabase ?? (await createSupabaseServerClient());
    const access = verifiedAccess ?? (await requireApprovedLender(supabase));

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
        message: "This application is not available for lender review.",
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

    const offerFlagsResult = await loadAcceptedOfferFlags(supabase, [
      application.id,
    ]);

    if (!offerFlagsResult.ok) {
      return {
        ok: false,
        mode: "supabase",
        application: null,
        message: "Could not load offer availability.",
      };
    }

    return {
      ok: true,
      mode: "supabase",
      application: toLenderApplicationReview(
        application,
        portfolio,
        offers,
        offerFlagsResult.flags.get(application.id) ?? false,
      ),
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

export async function loadLenderOffers(
  verifiedAccess?: ApprovedLenderAccess,
): Promise<LenderOffersLoadResult> {
  try {
    const supabase =
      verifiedAccess?.supabase ?? (await createSupabaseServerClient());
    const access = verifiedAccess ?? (await requireApprovedLender(supabase));

    if (!access.ok) {
      return {
        ok: false,
        mode: "auth",
        offers: [],
        message: access.message,
      };
    }

    const [offersResult, activeLoansResult] = await Promise.all([
      supabase
        .from("loan_offers")
        .select(lenderReviewOfferSelect)
        .eq("lender_id", access.profile.id)
        .order("sent_at", { ascending: false }),
      loadLenderActiveLoans(access),
    ]);
    const { data: offers, error: offersError } = offersResult;

    if (offersError) {
      return {
        ok: false,
        mode: "supabase",
        offers: [],
        message: "Could not load offers.",
      };
    }

    if (!activeLoansResult.ok) {
      return {
        ok: false,
        mode: activeLoansResult.mode,
        offers: [],
        message: activeLoansResult.message,
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
      offers: combineOffersWithApplications(
        offers,
        applications,
        portfolios,
        activeLoansResult.loans,
      ),
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

export function isApplicationActionableForOffer(
  application: Pick<
    LenderApplicationReview,
    "status" | "currentLenderOfferState" | "hasAcceptedOffer"
  >,
) {
  return (
    openApplicationStatuses.includes(
      application.status as (typeof openApplicationStatuses)[number],
    ) &&
    !application.hasAcceptedOffer &&
    application.currentLenderOfferState !== "offer_pending" &&
    application.currentLenderOfferState !== "offer_accepted"
  );
}

function combineApplicationsWithPortfolios(
  applications: Database["public"]["Tables"]["loan_applications"]["Row"][],
  portfolios: BorrowerPortfolioRow[],
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][] = [],
  acceptedOfferFlags = new Map<string, boolean>(),
) {
  const portfoliosById = new Map(
    portfolios.map((portfolio) => [portfolio.id, portfolio]),
  );
  const offersByApplicationId = groupOffersByApplicationId(offers);

  return applications.flatMap((application) => {
    const portfolio = portfoliosById.get(application.borrower_portfolio_id);

    if (!portfolio) {
      return [];
    }

    return [
      toLenderApplicationReview(
        application,
        portfolio,
        offersByApplicationId.get(application.id) ?? [],
        acceptedOfferFlags.get(application.id) ?? false,
      ),
    ];
  });
}

function toLenderApplicationReview(
  application: Database["public"]["Tables"]["loan_applications"]["Row"],
  portfolio: BorrowerPortfolioRow,
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][] = [],
  hasAcceptedOffer = offers.some((offer) => offer.status === "accepted"),
): LenderApplicationReview {
  const mappedApplication = mapLoanApplicationRow(application);
  const reviewPortfolio = getSubmittedPortfolio(application, portfolio);
  const estimatedNetMonthlyRevenue =
    reviewPortfolio.monthly_gross_revenue - reviewPortfolio.monthly_expenses;

  return {
    ...mappedApplication,
    borrowerId: application.borrower_id,
    currentLenderOfferState: getCurrentLenderOfferState(offers),
    hasAcceptedOffer,
    portfolio: {
      businessType: reviewPortfolio.business_type,
      businessTypeLabel: businessTypeLabels[reviewPortfolio.business_type],
      location: reviewPortfolio.location,
      monthlyGrossRevenue: reviewPortfolio.monthly_gross_revenue,
      monthlyExpenses: reviewPortfolio.monthly_expenses,
      existingLoanPayments: reviewPortfolio.existing_loan_payments,
      yearsInOperation: reviewPortfolio.years_in_operation,
      loanPurposeContext: reviewPortfolio.loan_purpose_context,
    },
    financialIndicators: {
      estimatedNetMonthlyRevenue,
      monthlyCashAfterLoanPayments:
        estimatedNetMonthlyRevenue - reviewPortfolio.existing_loan_payments,
    },
    offers: offers.map(mapLoanOfferRow),
  };
}

async function loadAcceptedOfferFlags(
  supabase: SupabaseServerClient,
  applicationIds: string[],
): Promise<
  | { ok: true; flags: Map<string, boolean> }
  | { ok: false; flags: Map<string, boolean> }
> {
  if (applicationIds.length === 0) {
    return { ok: true, flags: new Map() };
  }

  const { data, error } = await supabase.rpc(
    "get_lender_application_offer_flags",
    {
      p_loan_application_ids: applicationIds,
    },
  );

  if (error) {
    return { ok: false, flags: new Map() };
  }

  return {
    ok: true,
    flags: new Map(
      data.map((row) => [row.loan_application_id, row.has_accepted_offer]),
    ),
  };
}

function getSubmittedPortfolio(
  application: Database["public"]["Tables"]["loan_applications"]["Row"],
  fallback: BorrowerPortfolioRow,
): BorrowerPortfolioRow {
  const snapshot = application.borrower_profile_snapshot;

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return fallback;
  }
  const profile = snapshot as Record<string, unknown>;

  return {
    ...fallback,
    business_type:
      isBusinessType(profile.business_type)
        ? profile.business_type
        : fallback.business_type,
    location:
      typeof profile.location === "string" ? profile.location : fallback.location,
    monthly_gross_revenue:
      typeof profile.monthly_gross_revenue === "number"
        ? profile.monthly_gross_revenue
        : fallback.monthly_gross_revenue,
    monthly_expenses:
      typeof profile.monthly_expenses === "number"
        ? profile.monthly_expenses
        : fallback.monthly_expenses,
    existing_loan_payments:
      typeof profile.existing_loan_payments === "number"
        ? profile.existing_loan_payments
        : fallback.existing_loan_payments,
    years_in_operation:
      typeof profile.years_in_operation === "number"
        ? profile.years_in_operation
        : fallback.years_in_operation,
    loan_purpose_context:
      typeof profile.loan_purpose_context === "string"
        ? profile.loan_purpose_context
        : fallback.loan_purpose_context,
  };
}

function isBusinessType(value: unknown): value is BorrowerPortfolioRow["business_type"] {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(businessTypeLabels, value)
  );
}

function combineOffersWithApplications(
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][],
  applications: Database["public"]["Tables"]["loan_applications"]["Row"][],
  portfolios: BorrowerPortfolioRow[],
  activeLoans: ActiveLoanSummary[] = [],
) {
  const applicationsById = new Map(
    applications.map((application) => [application.id, application]),
  );
  const portfoliosById = new Map(
    portfolios.map((portfolio) => [portfolio.id, portfolio]),
  );

  const activeLoansByOfferId = new Map(
    activeLoans.map((loan) => [loan.acceptedOfferId, loan]),
  );

  return offers.map((offer) => {
    const mappedOffer = mapLoanOfferRow(offer);
    const application = applicationsById.get(offer.loan_application_id);
    const activeLoan = activeLoansByOfferId.get(offer.id) ?? null;

    if (!application) {
      return {
        ...mappedOffer,
        activeLoan,
        application: null,
      };
    }

    const portfolio = portfoliosById.get(application.borrower_portfolio_id);
    const mappedApplication = mapLoanApplicationRow(application);

    return {
      ...mappedOffer,
      activeLoan,
      application: {
        id: application.id,
        status: mappedApplication.status,
        requestedAmount: mappedApplication.requestedAmount,
        purpose: mappedApplication.purpose,
        submittedAt: mappedApplication.submittedAt,
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

function groupOffersByApplicationId(
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][],
) {
  return offers.reduce(
    (groups, offer) => {
      const applicationOffers = groups.get(offer.loan_application_id) ?? [];
      groups.set(offer.loan_application_id, [...applicationOffers, offer]);

      return groups;
    },
    new Map<string, Database["public"]["Tables"]["loan_offers"]["Row"][]>(),
  );
}

function getCurrentLenderOfferState(
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][],
): LenderApplicationReview["currentLenderOfferState"] {
  if (offers.some((offer) => offer.status === "accepted")) {
    return "offer_accepted";
  }

  if (offers.some((offer) => offer.status === "pending")) {
    return "offer_pending";
  }

  if (offers.some((offer) => offer.status === "declined")) {
    return "offer_declined";
  }

  if (offers.some((offer) => offer.status === "expired")) {
    return "offer_expired";
  }

  return "not_offered";
}

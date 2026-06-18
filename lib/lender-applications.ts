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
import { isUuid } from "@/lib/validation/uuid";
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
  currentLenderId: string;
  currentLenderOfferState:
    | "not_offered"
    | "offer_pending"
    | "offer_accepted"
    | "offer_declined"
    | "offer_expired";
  hasAcceptedOffer: boolean;
  currentLenderOffer: LoanOfferSummary | null;
  portfolio: {
    businessType: BorrowerPortfolioRow["business_type"];
    businessTypeLabel: string;
    location: string;
    monthlyGrossRevenue: number;
    monthlyExpenses: number;
    existingLoanPayments: number;
    yearsInOperation: number;
    loanPurposeContext: string | null;
  };
  financialIndicators: {
    estimatedNetMonthlyRevenue: number;
    monthlyCashAfterLoanPayments: number;
  };
  creditProfileHistory: BorrowerCreditProfileHistorySummary;
  offers: LoanOfferSummary[];
};

export type BorrowerCreditProfileHistoryStatus =
  | "first_time_applicant"
  | "completed_one_cycle"
  | "completed_multiple_cycles"
  | "good_payer"
  | "strong_repeat_payer"
  | "needs_review";

export type BorrowerCreditProfileHistorySummary = {
  status: BorrowerCreditProfileHistoryStatus;
  label: string;
  description: string;
  completedLoanCycles: number;
  onTimeRepayments: number | null;
  activeLoanCount: number;
  lateRepayments: number | null;
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
  "id, borrower_id, borrower_portfolio_id, requested_amount, credit_limit_at_submission, used_credit_at_submission, available_credit_at_submission, monthly_net_cash_flow_at_submission, credit_readiness_status, borrower_profile_snapshot, borrower_readiness_snapshot, borrower_credit_profile_grade, borrower_credit_profile_assessment, purpose, preferred_term, remarks, status, submitted_at, borrower_removed_at, created_at, updated_at";

const lenderReviewPortfolioSelect =
  "id, borrower_id, business_name, business_description, business_type, started_operating_at, business_address, barangay, city_or_municipality, province, region, zip_code, location, operating_model, primary_sales_channel, revenue_period, revenue_confidence, monthly_gross_revenue, monthly_expenses, existing_loan_payments, years_in_operation, expense_breakdown, debt_obligation_summary, loan_purpose_context, profile_last_confirmed_at, profile_review_status, created_at, updated_at";

const lenderReviewOfferSelect =
  "id, loan_application_id, borrower_id, lender_id, lender_name, approved_amount, interest_service_charge_rate, repayment_amount, fees, due_date, remarks, status, sent_at, repayment_channel, repayment_account_name, repayment_account_number, repayment_instructions, created_at, updated_at";
const lenderReviewActiveLoanSelect =
  "id, borrower_id, lender_id, status";
const lenderReviewRepaymentScheduleSelect =
  "active_loan_id, status";

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
    const { data: allApplicationOffers, error: lenderOffersError } = await supabase
      .from("loan_offers")
      .select(lenderReviewOfferSelect)
      .in("loan_application_id", applicationIds)
      .order("sent_at", { ascending: false });

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

    const openApplications = combineApplicationsWithPortfolios(
      applications,
      portfolios,
      allApplicationOffers,
      access.profile.id,
      offerFlagsResult.flags,
    ).filter(
      (application) => application.currentLenderOfferState === "not_offered",
    );

    return {
      ok: true,
      mode: "supabase",
      applications: openApplications,
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
    if (!isUuid(applicationId)) {
      return {
        ok: false,
        mode: "not-found",
        application: null,
        message: "This application is not available for lender review.",
      };
    }

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

    const { data: allApplicationOffers, error: offersError } = await supabase
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

    const [offerFlagsResult, creditProfileHistory] = await Promise.all([
      loadAcceptedOfferFlags(supabase, [application.id]),
      loadBorrowerCreditProfileHistory(supabase, application.borrower_id),
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
        allApplicationOffers,
        access.profile.id,
        offerFlagsResult.flags.get(application.id) ?? false,
        creditProfileHistory,
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
  currentLenderId = "",
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
        currentLenderId,
        acceptedOfferFlags.get(application.id) ?? false,
      ),
    ];
  });
}

function toLenderApplicationReview(
  application: Database["public"]["Tables"]["loan_applications"]["Row"],
  portfolio: BorrowerPortfolioRow,
  allApplicationOffers: Database["public"]["Tables"]["loan_offers"]["Row"][] = [],
  currentLenderId = "",
  hasAcceptedOffer = allApplicationOffers.some(
    (offer) => offer.status === "accepted",
  ),
  creditProfileHistory: BorrowerCreditProfileHistorySummary = buildBorrowerCreditProfileHistorySummary(
    [],
    [],
  ),
): LenderApplicationReview {
  const mappedApplication = mapLoanApplicationRow(application);
  const reviewPortfolio = getSubmittedPortfolio(application, portfolio);
  const businessType = reviewPortfolio.business_type ?? "other";
  const location = reviewPortfolio.location ?? "Not provided";
  const monthlyGrossRevenue = reviewPortfolio.monthly_gross_revenue ?? 0;
  const monthlyExpenses = reviewPortfolio.monthly_expenses ?? 0;
  const existingLoanPayments = reviewPortfolio.existing_loan_payments ?? 0;
  const yearsInOperation = reviewPortfolio.years_in_operation ?? 0;
  const estimatedNetMonthlyRevenue =
    monthlyGrossRevenue - monthlyExpenses;
  const currentLenderOffers = getCurrentLenderOffers(
    allApplicationOffers,
    currentLenderId,
  );
  const currentLenderOffer = getCurrentLenderOffer(currentLenderOffers);

  return {
    ...mappedApplication,
    borrowerId: application.borrower_id,
    currentLenderId,
    currentLenderOfferState: getCurrentLenderOfferState(currentLenderOffers),
    hasAcceptedOffer,
    currentLenderOffer: currentLenderOffer
      ? mapLoanOfferRow(currentLenderOffer)
      : null,
    portfolio: {
      businessType,
      businessTypeLabel: businessTypeLabels[businessType],
      location,
      monthlyGrossRevenue,
      monthlyExpenses,
      existingLoanPayments,
      yearsInOperation,
      loanPurposeContext: reviewPortfolio.loan_purpose_context,
    },
    financialIndicators: {
      estimatedNetMonthlyRevenue,
      monthlyCashAfterLoanPayments:
        estimatedNetMonthlyRevenue - existingLoanPayments,
    },
    creditProfileHistory,
    offers: allApplicationOffers.map(mapLoanOfferRow),
  };
}

async function loadBorrowerCreditProfileHistory(
  supabase: SupabaseServerClient,
  borrowerId: string,
): Promise<BorrowerCreditProfileHistorySummary> {
  const { data: loans, error: loansError } = await supabase
    .from("active_loans")
    .select(lenderReviewActiveLoanSelect)
    .eq("borrower_id", borrowerId);

  if (loansError || loans.length === 0) {
    return buildBorrowerCreditProfileHistorySummary([], []);
  }

  const loanIds = loans.map((loan) => loan.id);
  const { data: repayments, error: repaymentsError } = await supabase
    .from("loan_repayment_schedules")
    .select(lenderReviewRepaymentScheduleSelect)
    .in("active_loan_id", loanIds);

  return buildBorrowerCreditProfileHistorySummary(
    loans,
    repaymentsError ? [] : repayments,
  );
}

function buildBorrowerCreditProfileHistorySummary(
  loans: Pick<
    Database["public"]["Tables"]["active_loans"]["Row"],
    "id" | "status"
  >[],
  repayments: Pick<
    Database["public"]["Tables"]["loan_repayment_schedules"]["Row"],
    "active_loan_id" | "status"
  >[],
): BorrowerCreditProfileHistorySummary {
  const completedLoanCycles = loans.filter((loan) =>
    loan.status === "paid" || loan.status === "closed"
  ).length;
  const activeLoanCount = loans.filter((loan) =>
    loan.status === "active" || loan.status === "overdue"
  ).length;
  const hasRepaymentConcern =
    loans.some((loan) => loan.status === "overdue" || loan.status === "defaulted") ||
    repayments.some((repayment) =>
      repayment.status === "late" || repayment.status === "rejected"
    );
  const onTimeRepayments =
    repayments.length === 0
      ? null
      : repayments.filter((repayment) => repayment.status === "verified").length;
  const lateRepayments =
    repayments.length === 0
      ? null
      : repayments.filter((repayment) =>
          repayment.status === "late" || repayment.status === "rejected"
        ).length;
  const hasCleanCompletedHistory =
    completedLoanCycles > 0 &&
    repayments.length > 0 &&
    repayments.every((repayment) => repayment.status === "verified") &&
    !hasRepaymentConcern;

  if (hasRepaymentConcern) {
    return {
      status: "needs_review",
      label: "Needs review",
      description:
        "Repayment history includes an overdue or unresolved repayment item.",
      completedLoanCycles,
      onTimeRepayments,
      activeLoanCount,
      lateRepayments,
    };
  }

  if (completedLoanCycles >= 2 && hasCleanCompletedHistory) {
    return {
      status: "strong_repeat_payer",
      label: "Strong repeat payer",
      description:
        "Completed 2+ loan cycles with no missed repayments in available records.",
      completedLoanCycles,
      onTimeRepayments,
      activeLoanCount,
      lateRepayments,
    };
  }

  if (hasCleanCompletedHistory) {
    return {
      status: "good_payer",
      label: "Good payer",
      description:
        "Completed loan cycle with no missed repayments in available records.",
      completedLoanCycles,
      onTimeRepayments,
      activeLoanCount,
      lateRepayments,
    };
  }

  if (completedLoanCycles >= 2) {
    return {
      status: "completed_multiple_cycles",
      label: "Completed 2+ loan cycles",
      description:
        "Borrower has completed repeat loan cycles. Review current financials before sending an offer.",
      completedLoanCycles,
      onTimeRepayments,
      activeLoanCount,
      lateRepayments,
    };
  }

  if (completedLoanCycles === 1) {
    return {
      status: "completed_one_cycle",
      label: "Completed 1 loan cycle",
      description:
        "Borrower has completed one loan cycle. Review current financials before sending an offer.",
      completedLoanCycles,
      onTimeRepayments,
      activeLoanCount,
      lateRepayments,
    };
  }

  return {
    status: "first_time_applicant",
    label: "First-time applicant",
    description:
      "No completed loan cycles yet. Review submitted financials and verification before sending an offer.",
    completedLoanCycles,
    onTimeRepayments,
    activeLoanCount,
    lateRepayments,
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
              businessTypeLabel:
                businessTypeLabels[portfolio.business_type ?? "other"],
              location: portfolio.location ?? "Not provided",
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

function getCurrentLenderOffers(
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][],
  currentLenderId: string,
) {
  return offers.filter((offer) => offer.lender_id === currentLenderId);
}

function getCurrentLenderOffer(
  offers: Database["public"]["Tables"]["loan_offers"]["Row"][],
) {
  return (
    offers.find((offer) => offer.status === "pending") ??
    offers.find((offer) => offer.status === "accepted") ??
    offers.find((offer) => offer.status === "declined") ??
    offers.find((offer) => offer.status === "expired") ??
    offers[0] ??
    null
  );
}

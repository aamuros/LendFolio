import { getShortId } from "@/lib/manager-operations";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
type ActiveLoanRow = Database["public"]["Tables"]["active_loans"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["loan_applications"]["Row"];
type LoanOfferRow = Database["public"]["Tables"]["loan_offers"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileStatus = Database["public"]["Enums"]["profile_status"];
type RepaymentProofRow =
  Database["public"]["Tables"]["repayment_proofs"]["Row"];
type RepaymentScheduleRow =
  Database["public"]["Tables"]["loan_repayment_schedules"]["Row"];
type BorrowerPortfolioRow =
  Database["public"]["Tables"]["borrower_portfolios"]["Row"];
export type BusinessType = Database["public"]["Enums"]["business_type"];

type DashboardProfile = Pick<
  ProfileRow,
  "id" | "role" | "display_name" | "status" | "created_at"
>;
type DashboardActiveLoan = Pick<
  ActiveLoanRow,
  "id" | "borrower_id" | "lender_id" | "loan_application_id" | "status" | "started_at"
>;
type DashboardApplication = Pick<
  ApplicationRow,
  "id" | "borrower_id" | "borrower_portfolio_id" | "status" | "submitted_at"
> & {
  borrower_credit_profile_grade: string | null;
};
type DashboardOffer = Pick<
  LoanOfferRow,
  "id" | "lender_id" | "loan_application_id" | "status" | "sent_at"
>;
type DashboardBorrowerPortfolio = Pick<
  BorrowerPortfolioRow,
  "id" | "business_type"
>;
type DashboardRepaymentSchedule = Pick<
  RepaymentScheduleRow,
  "id" | "borrower_id" | "status"
>;
type DashboardRepaymentProof = Pick<
  RepaymentProofRow,
  "id" | "borrower_id" | "status"
>;

type QueryResult<T> = {
  ok: boolean;
  data: T[];
};

type CountResult = {
  ok: boolean;
  count: number;
};

export type ManagerDashboardKpi = {
  label: string;
  value: number;
  description: string;
  href: string;
  accent: "primary" | "blue" | "amber" | "rose";
};

export type ManagerMonthlyUserHeadcount = {
  month: string;
  label: string;
  active: number;
  pending: number;
  suspended: number;
  total: number;
};

export type ManagerUserStatusDistribution = {
  status: ProfileStatus;
  label: string;
  count: number;
};

export type ManagerLenderBusinessTypePerformance = {
  businessType: BusinessType;
  completedApplicationCount: number;
  acceptedOfferCount: number;
  activeLoanCount: number;
};

export type ManagerLenderPerformanceRow = {
  id: string;
  displayName: string;
  shortId: string;
  completedApplicationCount: number;
  acceptedOfferCount: number;
  activeLoanCount: number;
  href: string;
  businessTypePerformance: ManagerLenderBusinessTypePerformance[];
};

export type ManagerBorrowerPerformanceRow = {
  id: string;
  displayName: string;
  shortId: string;
  previewScore: number;
  creditProfileGrade: string | null;
  status: ProfileStatus;
  acceptedApplicationCount: number;
  verifiedRepaymentCount: number;
  riskFlagCount: number;
  activeLoanCount: number;
  paidLoanCount: number;
  href: string;
};

export type ManagerPendingActionCounts = {
  pendingBorrowerVerifications: number;
  pendingLenderReviews: number;
  openApplications: number;
  pendingRepaymentReviews: number;
};

export type ManagerMonthlyActivityRow = {
  month: string;
  label: string;
  applications: number;
  offers: number;
  loans: number;
};

export type ManagerDashboardOverview = {
  kpis: ManagerDashboardKpi[];
  pendingActions: ManagerPendingActionCounts;
  monthlyHeadcount: ManagerMonthlyUserHeadcount[];
  monthlyActivity: ManagerMonthlyActivityRow[];
  statusDistribution: ManagerUserStatusDistribution[];
  lenderPerformance: ManagerLenderPerformanceRow[];
  borrowerPerformance: ManagerBorrowerPerformanceRow[];
};

const profileStatuses: ProfileStatus[] = ["active", "pending", "suspended"];
const profileStatusLabels: Record<ProfileStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
};

export async function loadManagerDashboardOverview(
  supabase: SupabaseServerClient,
): Promise<{
  ok: boolean;
  message: string;
  dashboard: ManagerDashboardOverview;
}> {
  const [
    activeLoanCount,
    lenderCount,
    borrowerCount,
    applicationCount,
    profiles,
    activeLoans,
    applications,
    offers,
    borrowerPortfolios,
    repaymentSchedules,
    repaymentProofs,
    pendingVerificationCount,
    pendingLenderReviewCount,
  ] = await Promise.all([
    countActiveLoans(supabase),
    countProfilesByRole(supabase, "lender"),
    countProfilesByRole(supabase, "borrower"),
    countApplications(supabase),
    loadProfiles(supabase),
    loadActiveLoans(supabase),
    loadApplications(supabase),
    loadOffers(supabase),
    loadBorrowerPortfolios(supabase),
    loadRepaymentSchedules(supabase),
    loadRepaymentProofs(supabase),
    countPendingBorrowerVerifications(supabase),
    countPendingLenderReviews(supabase),
  ]);
  const results = [
    activeLoanCount,
    lenderCount,
    borrowerCount,
    applicationCount,
    profiles,
    activeLoans,
    applications,
    offers,
    borrowerPortfolios,
    repaymentSchedules,
    repaymentProofs,
    pendingVerificationCount,
    pendingLenderReviewCount,
  ];

  return {
    ok: results.every((result) => result.ok),
    message: results.every((result) => result.ok)
      ? "Manager dashboard metrics loaded."
      : "Some dashboard metrics could not be loaded.",
    dashboard: {
      kpis: [
        {
          label: "Total Active Loans",
          value: activeLoanCount.count,
          description: "Funded loans currently in progress",
          href: "/manager/loans?status=active",
          accent: "primary",
        },
        {
          label: "Total Lenders",
          value: lenderCount.count,
          description: "Registered lender profiles",
          href: "/manager/lookup?role=lender",
          accent: "blue",
        },
        {
          label: "Total Borrowers",
          value: borrowerCount.count,
          description: "Registered borrower profiles",
          href: "/manager/lookup?role=borrower",
          accent: "amber",
        },
        {
          label: "Total Applications",
          value: applicationCount.count,
          description: "Borrower requests across all statuses",
          href: "/manager/applications",
          accent: "rose",
        },
      ],
      pendingActions: {
        pendingBorrowerVerifications: pendingVerificationCount.count,
        pendingLenderReviews: pendingLenderReviewCount.count,
        openApplications: applications.data.filter(
          (app) => app.status === "submitted" || app.status === "open",
        ).length,
        pendingRepaymentReviews: repaymentProofs.data.filter(
          (proof) => proof.status === "submitted",
        ).length,
      },
      monthlyHeadcount: buildMonthlyHeadcount(profiles.data),
      monthlyActivity: buildMonthlyActivity(
        applications.data,
        offers.data,
        activeLoans.data,
      ),
      statusDistribution: buildStatusDistribution(profiles.data),
      lenderPerformance: buildLenderPerformance(
        profiles.data,
        activeLoans.data,
        offers.data,
        applications.data,
        borrowerPortfolios.data,
      ),
      borrowerPerformance: buildBorrowerPerformance(
        profiles.data,
        applications.data,
        activeLoans.data,
        repaymentSchedules.data,
        repaymentProofs.data,
      ),
    },
  };
}

async function countActiveLoans(
  supabase: SupabaseServerClient,
): Promise<CountResult> {
  try {
    const { count, error } = await supabase
      .from("active_loans")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    return { ok: !error, count: count ?? 0 };
  } catch {
    return failedCount();
  }
}

async function countProfilesByRole(
  supabase: SupabaseServerClient,
  role: Database["public"]["Enums"]["app_role"],
): Promise<CountResult> {
  try {
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", role);

    return { ok: !error, count: count ?? 0 };
  } catch {
    return failedCount();
  }
}

async function countApplications(
  supabase: SupabaseServerClient,
): Promise<CountResult> {
  try {
    const { count, error } = await supabase
      .from("loan_applications")
      .select("id", { count: "exact", head: true });

    return { ok: !error, count: count ?? 0 };
  } catch {
    return failedCount();
  }
}

async function loadProfiles(
  supabase: SupabaseServerClient,
): Promise<QueryResult<DashboardProfile>> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, display_name, status, created_at")
      .order("created_at", { ascending: true })
      .limit(1000);

    return { ok: !error, data: data ?? [] };
  } catch {
    return failedQuery();
  }
}

async function loadActiveLoans(
  supabase: SupabaseServerClient,
): Promise<QueryResult<DashboardActiveLoan>> {
  try {
    const { data, error } = await supabase
      .from("active_loans")
      .select("id, borrower_id, lender_id, loan_application_id, status, started_at")
      .limit(1000);

    return { ok: !error, data: data ?? [] };
  } catch {
    return failedQuery();
  }
}

async function loadApplications(
  supabase: SupabaseServerClient,
): Promise<QueryResult<DashboardApplication>> {
  try {
    const { data, error } = await supabase
      .from("loan_applications")
      .select("id, borrower_id, borrower_portfolio_id, status, borrower_credit_profile_grade, submitted_at")
      .limit(1000);

    return { ok: !error, data: data ?? [] };
  } catch {
    return failedQuery();
  }
}

async function loadOffers(
  supabase: SupabaseServerClient,
): Promise<QueryResult<DashboardOffer>> {
  try {
    const { data, error } = await supabase
      .from("loan_offers")
      .select("id, lender_id, loan_application_id, status, sent_at")
      .limit(1000);

    return { ok: !error, data: data ?? [] };
  } catch {
    return failedQuery();
  }
}

async function loadBorrowerPortfolios(
  supabase: SupabaseServerClient,
): Promise<QueryResult<DashboardBorrowerPortfolio>> {
  try {
    const { data, error } = await supabase
      .from("borrower_portfolios")
      .select("id, business_type")
      .limit(1000);

    return { ok: !error, data: data ?? [] };
  } catch {
    return failedQuery();
  }
}

async function loadRepaymentSchedules(
  supabase: SupabaseServerClient,
): Promise<QueryResult<DashboardRepaymentSchedule>> {
  try {
    const { data, error } = await supabase
      .from("loan_repayment_schedules")
      .select("id, borrower_id, status")
      .limit(2000);

    return { ok: !error, data: data ?? [] };
  } catch {
    return failedQuery();
  }
}

async function loadRepaymentProofs(
  supabase: SupabaseServerClient,
): Promise<QueryResult<DashboardRepaymentProof>> {
  try {
    const { data, error } = await supabase
      .from("repayment_proofs")
      .select("id, borrower_id, status")
      .limit(2000);

    return { ok: !error, data: data ?? [] };
  } catch {
    return failedQuery();
  }
}

function failedCount(): CountResult {
  return { ok: false, count: 0 };
}

async function countPendingBorrowerVerifications(
  supabase: SupabaseServerClient,
): Promise<CountResult> {
  try {
    const { count, error } = await supabase
      .from("borrower_verifications")
      .select("id", { count: "exact", head: true })
      .in("verification_status", ["submitted", "under_review"]);

    return { ok: !error, count: count ?? 0 };
  } catch {
    return failedCount();
  }
}

async function countPendingLenderReviews(
  supabase: SupabaseServerClient,
): Promise<CountResult> {
  try {
    const { count, error } = await supabase
      .from("lender_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending");

    return { ok: !error, count: count ?? 0 };
  } catch {
    return failedCount();
  }
}

function failedQuery<T>(): QueryResult<T> {
  return { ok: false, data: [] };
}

function buildMonthlyHeadcount(
  profiles: DashboardProfile[],
): ManagerMonthlyUserHeadcount[] {
  const months = getDashboardMonths();
  const monthCounts = new Map(
    months.map((month) => [
      month.key,
      {
        month: month.key,
        label: month.label,
        active: 0,
        pending: 0,
        suspended: 0,
        total: 0,
      },
    ]),
  );

  profiles.forEach((profile) => {
    const key = toMonthKey(new Date(profile.created_at));
    const month = monthCounts.get(key);

    if (!month) return;

    month[profile.status] += 1;
    month.total += 1;
  });

  return months.map(
    (month) =>
      monthCounts.get(month.key) ?? {
        month: month.key,
        label: month.label,
        active: 0,
        pending: 0,
        suspended: 0,
        total: 0,
      },
  );
}

function buildMonthlyActivity(
  applications: DashboardApplication[],
  offers: DashboardOffer[],
  activeLoans: DashboardActiveLoan[],
): ManagerMonthlyActivityRow[] {
  const months = getDashboardMonths();
  const monthCounts = new Map(
    months.map((month) => [
      month.key,
      {
        month: month.key,
        label: month.label,
        applications: 0,
        offers: 0,
        loans: 0,
      },
    ]),
  );

  for (const application of applications) {
    if (!application.submitted_at) continue;
    const key = toMonthKey(new Date(application.submitted_at));
    const row = monthCounts.get(key);
    if (row) row.applications += 1;
  }

  for (const offer of offers) {
    if (!offer.sent_at) continue;
    const key = toMonthKey(new Date(offer.sent_at));
    const row = monthCounts.get(key);
    if (row) row.offers += 1;
  }

  for (const loan of activeLoans) {
    if (!loan.started_at) continue;
    const key = toMonthKey(new Date(loan.started_at));
    const row = monthCounts.get(key);
    if (row) row.loans += 1;
  }

  return months.map(
    (month) =>
      monthCounts.get(month.key) ?? {
        month: month.key,
        label: month.label,
        applications: 0,
        offers: 0,
        loans: 0,
      },
  );
}

function buildStatusDistribution(
  profiles: DashboardProfile[],
): ManagerUserStatusDistribution[] {
  return profileStatuses.map((status) => ({
    status,
    label: profileStatusLabels[status],
    count: profiles.filter((profile) => profile.status === status).length,
  }));
}

function buildLenderPerformance(
  profiles: DashboardProfile[],
  activeLoans: DashboardActiveLoan[],
  offers: DashboardOffer[],
  applications: DashboardApplication[],
  borrowerPortfolios: DashboardBorrowerPortfolio[],
): ManagerLenderPerformanceRow[] {
  const activeLoansByLender = countBy(
    activeLoans.filter((loan) => loan.status === "active"),
    "lender_id",
  );
  const acceptedOffersByLender = countBy(
    offers.filter((offer) => offer.status === "accepted"),
    "lender_id",
  );
  const applicationBusinessTypeById = getApplicationBusinessTypeById(
    applications,
    borrowerPortfolios,
  );
  const activeLoansByLenderAndBusinessType = countByLenderBusinessType(
    activeLoans.filter((loan) => loan.status === "active"),
    applicationBusinessTypeById,
  );
  const acceptedOffersByLenderAndBusinessType = countByLenderBusinessType(
    offers.filter((offer) => offer.status === "accepted"),
    applicationBusinessTypeById,
  );

  return profiles
    .filter((profile) => profile.role === "lender")
    .map((profile) => {
      const activeLoanCount = activeLoansByLender.get(profile.id) ?? 0;
      const acceptedOfferCount = acceptedOffersByLender.get(profile.id) ?? 0;
      const businessTypePerformance = buildBusinessTypePerformance(
        activeLoansByLenderAndBusinessType.get(profile.id) ?? new Map(),
        acceptedOffersByLenderAndBusinessType.get(profile.id) ?? new Map(),
      );

      return {
        id: profile.id,
        displayName: profile.display_name,
        shortId: getShortId(profile.id),
        completedApplicationCount:
          activeLoanCount > 0 ? activeLoanCount : acceptedOfferCount,
        acceptedOfferCount,
        activeLoanCount,
        href: `/manager/users/${profile.id}`,
        businessTypePerformance,
      };
    })
    .filter(
      (row) =>
        row.completedApplicationCount > 0 ||
        row.acceptedOfferCount > 0 ||
        row.activeLoanCount > 0,
    )
    .sort(
      (a, b) =>
        b.completedApplicationCount - a.completedApplicationCount ||
        b.activeLoanCount - a.activeLoanCount ||
        a.displayName.localeCompare(b.displayName),
    );
}

function buildBorrowerPerformance(
  profiles: DashboardProfile[],
  applications: DashboardApplication[],
  activeLoans: DashboardActiveLoan[],
  repaymentSchedules: DashboardRepaymentSchedule[],
  repaymentProofs: DashboardRepaymentProof[],
): ManagerBorrowerPerformanceRow[] {
  const applicationCountsByBorrower = countBy(applications, "borrower_id");
  const acceptedApplicationsByBorrower = countBy(
    applications.filter((application) => application.status === "accepted"),
    "borrower_id",
  );
  const loansByBorrower = countBy(activeLoans, "borrower_id");
  const activeLoansByBorrower = countBy(
    activeLoans.filter((loan) => loan.status === "active"),
    "borrower_id",
  );
  const paidLoansByBorrower = countBy(
    activeLoans.filter((loan) => loan.status === "paid"),
    "borrower_id",
  );
  const overdueDefaultedLoansByBorrower = countBy(
    activeLoans.filter(
      (loan) => loan.status === "overdue" || loan.status === "defaulted",
    ),
    "borrower_id",
  );
  const scheduleCountsByBorrower = countBy(repaymentSchedules, "borrower_id");
  const verifiedRepaymentsByBorrower = countBy(
    repaymentSchedules.filter((schedule) => schedule.status === "verified"),
    "borrower_id",
  );
  const proofCountsByBorrower = countBy(repaymentProofs, "borrower_id");
  const rejectedProofsByBorrower = countBy(
    repaymentProofs.filter((proof) => proof.status === "rejected"),
    "borrower_id",
  );
  const latestGradeByBorrower = getLatestGradeByBorrower(applications);

  const rows: ManagerBorrowerPerformanceRow[] = profiles
    .filter((profile) => profile.role === "borrower")
    .map((profile) => {
      const acceptedApplicationCount =
        acceptedApplicationsByBorrower.get(profile.id) ?? 0;
      const verifiedRepaymentCount =
        verifiedRepaymentsByBorrower.get(profile.id) ?? 0;
      const activeLoanCount = activeLoansByBorrower.get(profile.id) ?? 0;
      const paidLoanCount = paidLoansByBorrower.get(profile.id) ?? 0;
      const rejectedProofCount = rejectedProofsByBorrower.get(profile.id) ?? 0;
      const overdueDefaultedLoanCount =
        overdueDefaultedLoansByBorrower.get(profile.id) ?? 0;
      const riskFlagCount = rejectedProofCount + overdueDefaultedLoanCount;
      const hasActivity =
        (applicationCountsByBorrower.get(profile.id) ?? 0) > 0 ||
        (loansByBorrower.get(profile.id) ?? 0) > 0 ||
        (scheduleCountsByBorrower.get(profile.id) ?? 0) > 0 ||
        (proofCountsByBorrower.get(profile.id) ?? 0) > 0;

      if (!hasActivity) return null;

      return {
        id: profile.id,
        displayName: profile.display_name,
        shortId: getShortId(profile.id),
        previewScore: calculateBorrowerReadinessScore({
          acceptedApplicationCount,
          verifiedRepaymentCount,
          activeLoanCount,
          paidLoanCount,
          rejectedProofCount,
          overdueDefaultedLoanCount,
        }),
        creditProfileGrade: latestGradeByBorrower.get(profile.id) ?? null,
        status: profile.status,
        acceptedApplicationCount,
        verifiedRepaymentCount,
        riskFlagCount,
        activeLoanCount,
        paidLoanCount,
        href: `/manager/users/${profile.id}`,
      };
    })
    .filter((row): row is ManagerBorrowerPerformanceRow => row !== null)
    .sort(
      (a, b) =>
        b.previewScore - a.previewScore ||
        b.verifiedRepaymentCount - a.verifiedRepaymentCount ||
        a.displayName.localeCompare(b.displayName),
    )
    .slice(0, 6);

  return rows;
}

function calculateBorrowerReadinessScore({
  acceptedApplicationCount,
  verifiedRepaymentCount,
  activeLoanCount,
  paidLoanCount,
  rejectedProofCount,
  overdueDefaultedLoanCount,
}: {
  acceptedApplicationCount: number;
  verifiedRepaymentCount: number;
  activeLoanCount: number;
  paidLoanCount: number;
  rejectedProofCount: number;
  overdueDefaultedLoanCount: number;
}) {
  const score =
    50 +
    acceptedApplicationCount * 10 +
    verifiedRepaymentCount * 8 +
    activeLoanCount * 5 +
    paidLoanCount * 10 -
    rejectedProofCount * 7 -
    overdueDefaultedLoanCount * 10;

  return Math.round(Math.min(100, Math.max(0, score)));
}

function getApplicationBusinessTypeById(
  applications: DashboardApplication[],
  borrowerPortfolios: DashboardBorrowerPortfolio[],
) {
  const portfolioBusinessTypeById = new Map(
    borrowerPortfolios.map((portfolio) => [
      portfolio.id,
      portfolio.business_type,
    ]),
  );

  return new Map(
    applications.flatMap((application) => {
      const businessType = portfolioBusinessTypeById.get(
        application.borrower_portfolio_id,
      );

      return businessType ? [[application.id, businessType]] : [];
    }),
  );
}

function countByLenderBusinessType<
  T extends { lender_id: string; loan_application_id: string },
>(rows: T[], applicationBusinessTypeById: Map<string, BusinessType>) {
  return rows.reduce((counts, row) => {
    const businessType = applicationBusinessTypeById.get(
      row.loan_application_id,
    );

    if (!businessType) return counts;

    const lenderCounts = counts.get(row.lender_id) ?? new Map();
    lenderCounts.set(businessType, (lenderCounts.get(businessType) ?? 0) + 1);
    counts.set(row.lender_id, lenderCounts);

    return counts;
  }, new Map<string, Map<BusinessType, number>>());
}

function buildBusinessTypePerformance(
  activeLoanCounts: Map<BusinessType, number>,
  acceptedOfferCounts: Map<BusinessType, number>,
): ManagerLenderBusinessTypePerformance[] {
  const businessTypes = new Set([
    ...activeLoanCounts.keys(),
    ...acceptedOfferCounts.keys(),
  ]);

  return Array.from(businessTypes)
    .map((businessType) => {
      const activeLoanCount = activeLoanCounts.get(businessType) ?? 0;
      const acceptedOfferCount = acceptedOfferCounts.get(businessType) ?? 0;

      return {
        businessType,
        completedApplicationCount:
          activeLoanCount > 0 ? activeLoanCount : acceptedOfferCount,
        acceptedOfferCount,
        activeLoanCount,
      };
    })
    .filter(
      (row) =>
        row.completedApplicationCount > 0 ||
        row.acceptedOfferCount > 0 ||
        row.activeLoanCount > 0,
    );
}

function countBy<T extends Record<K, string>, K extends keyof T>(
  rows: T[],
  key: K,
) {
  return rows.reduce((counts, row) => {
    counts.set(row[key], (counts.get(row[key]) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function getDashboardMonths() {
  const start = new Date(Date.UTC(2026, 4, 1));

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
    );

    return {
      key: toMonthKey(date),
      label: new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
    };
  });
}

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function getLatestGradeByBorrower(
  applications: DashboardApplication[],
): Map<string, string> {
  const gradeMap = new Map<string, string>();

  for (const application of applications) {
    if (
      application.borrower_credit_profile_grade &&
      !gradeMap.has(application.borrower_id)
    ) {
      gradeMap.set(
        application.borrower_id,
        application.borrower_credit_profile_grade,
      );
    }
  }

  return gradeMap;
}

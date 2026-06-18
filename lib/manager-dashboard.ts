import { getShortId } from "@/lib/manager-operations";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;
type ProfileStatus = Database["public"]["Enums"]["profile_status"];
export type BusinessType = Database["public"]["Enums"]["business_type"];

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
  revenue: {
    totalPlatformRevenue: number;
    currentMonthPlatformRevenue: number;
    projectedProcessingFeeRevenue: number;
  };
  pendingActions: ManagerPendingActionCounts;
  monthlyHeadcount: ManagerMonthlyUserHeadcount[];
  monthlyActivity: ManagerMonthlyActivityRow[];
  statusDistribution: ManagerUserStatusDistribution[];
  lenderPerformance: ManagerLenderPerformanceRow[];
  borrowerPerformance: ManagerBorrowerPerformanceRow[];
};

const profileStatusLabels: Record<ProfileStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
};

const statusDistributionStatuses: ProfileStatus[] = [
  "active",
  "pending",
  "suspended",
];

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
    headcountResult,
    statusDistResult,
    monthlyActivityResult,
    pendingCountsResult,
    lenderPerfResult,
    borrowerPerfResult,
    revenueResult,
  ] = await Promise.all([
    countActiveLoans(supabase),
    countProfilesByRole(supabase, "lender"),
    countProfilesByRole(supabase, "borrower"),
    countApplications(supabase),
    supabase.rpc("manager_dashboard_monthly_headcount"),
    supabase.rpc("manager_dashboard_status_distribution"),
    supabase.rpc("manager_dashboard_monthly_activity"),
    supabase.rpc("manager_dashboard_pending_action_counts"),
    supabase.rpc("manager_dashboard_lender_performance"),
    supabase.rpc("manager_dashboard_borrower_performance"),
    loadPlatformRevenue(supabase),
  ]);

  const counts = [
    activeLoanCount,
    lenderCount,
    borrowerCount,
    applicationCount,
  ];

  const headcountData = headcountResult.data ?? [];
  const statusDistData = statusDistResult.data ?? [];
  const activityData = monthlyActivityResult.data ?? [];
  const pendingData = pendingCountsResult.data?.[0];
  const lenderPerfData = lenderPerfResult.data ?? [];
  const borrowerPerfData = borrowerPerfResult.data ?? [];

  const months = getDashboardMonths();
  const headcountByKey = new Map(
    headcountData.map((row) => [row.month_key, row]),
  );
  const monthlyHeadcount: ManagerMonthlyUserHeadcount[] = months.map(
    (month) => {
      const row = headcountByKey.get(month.key);
      return {
        month: month.key,
        label: month.label,
        active: Number(row?.active_count ?? 0),
        pending: Number(row?.pending_count ?? 0),
        suspended: Number(row?.suspended_count ?? 0),
        total: Number(row?.total_count ?? 0),
      };
    },
  );

  const statusDistMap = new Map(
    statusDistData.map((row) => [row.status, Number(row.count)]),
  );
  const statusDistribution: ManagerUserStatusDistribution[] =
    statusDistributionStatuses.map((status) => ({
      status,
      label: profileStatusLabels[status],
      count: statusDistMap.get(status) ?? 0,
    }));

  const activityByKey = new Map(
    activityData.map((row) => [row.month_key, row]),
  );
  const monthlyActivity: ManagerMonthlyActivityRow[] = months.map((month) => {
    const row = activityByKey.get(month.key);
    return {
      month: month.key,
      label: month.label,
      applications: Number(row?.applications ?? 0),
      offers: Number(row?.offers ?? 0),
      loans: Number(row?.loans ?? 0),
    };
  });

  const pendingActions: ManagerPendingActionCounts = {
    pendingBorrowerVerifications: Number(
      pendingData?.pending_borrower_verifications ?? 0,
    ),
    pendingLenderReviews: Number(pendingData?.pending_lender_reviews ?? 0),
    openApplications: Number(pendingData?.open_applications ?? 0),
    pendingRepaymentReviews: Number(
      pendingData?.pending_repayment_reviews ?? 0,
    ),
  };

  const lenderPerformance = buildLenderPerformanceFromRpc(lenderPerfData);
  const borrowerPerformance =
    buildBorrowerPerformanceFromRpc(borrowerPerfData);

  return {
    ok: counts.every((result) => result.ok),
    message: counts.every((result) => result.ok)
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
      revenue: revenueResult,
      pendingActions,
      monthlyHeadcount,
      monthlyActivity,
      statusDistribution,
      lenderPerformance,
      borrowerPerformance,
    },
  };
}

async function loadPlatformRevenue(supabase: SupabaseServerClient) {
  const currentMonthStart = new Date();
  currentMonthStart.setUTCDate(1);
  currentMonthStart.setUTCHours(0, 0, 0, 0);

  const [activeLoansResult, pendingOffersResult] = await Promise.all([
    supabase
      .from("active_loans")
      .select("processing_fee_amount, started_at"),
    supabase
      .from("loan_offers")
      .select("processing_fee_amount")
      .eq("status", "pending"),
  ]);

  const activeLoans = activeLoansResult.data ?? [];
  const pendingOffers = pendingOffersResult.data ?? [];
  const monthStartMs = currentMonthStart.getTime();

  return {
    totalPlatformRevenue: activeLoans.reduce(
      (sum, loan) => sum + Number(loan.processing_fee_amount ?? 0),
      0,
    ),
    currentMonthPlatformRevenue: activeLoans
      .filter((loan) => new Date(loan.started_at).getTime() >= monthStartMs)
      .reduce((sum, loan) => sum + Number(loan.processing_fee_amount ?? 0), 0),
    projectedProcessingFeeRevenue: pendingOffers.reduce(
      (sum, offer) => sum + Number(offer.processing_fee_amount ?? 0),
      0,
    ),
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

function failedCount(): CountResult {
  return { ok: false, count: 0 };
}

function buildLenderPerformanceFromRpc(
  rows: Array<{
    lender_id: string;
    display_name: string;
    active_loan_count: number | bigint;
    accepted_offer_count: number | bigint;
    business_type: string | null;
    business_type_active_loans: number | bigint;
    business_type_accepted_offers: number | bigint;
  }>,
): ManagerLenderPerformanceRow[] {
  const lenderMap = new Map<
    string,
    {
      id: string;
      displayName: string;
      activeLoanCount: number;
      acceptedOfferCount: number;
      businessTypes: Map<
        BusinessType,
        { activeLoans: number; acceptedOffers: number }
      >;
    }
  >();

  for (const row of rows) {
    const id = row.lender_id;
    let entry = lenderMap.get(id);

    if (!entry) {
      entry = {
        id,
        displayName: row.display_name,
        activeLoanCount: Number(row.active_loan_count),
        acceptedOfferCount: Number(row.accepted_offer_count),
        businessTypes: new Map(),
      };
      lenderMap.set(id, entry);
    }

    if (row.business_type) {
      entry.businessTypes.set(row.business_type as BusinessType, {
        activeLoans: Number(row.business_type_active_loans),
        acceptedOffers: Number(row.business_type_accepted_offers),
      });
    }
  }

  return Array.from(lenderMap.values())
    .map((entry) => {
      const completedApplicationCount =
        entry.activeLoanCount > 0
          ? entry.activeLoanCount
          : entry.acceptedOfferCount;

      const businessTypePerformance: ManagerLenderBusinessTypePerformance[] =
        Array.from(entry.businessTypes.entries())
          .map(([businessType, counts]) => ({
            businessType,
            completedApplicationCount:
              counts.activeLoans > 0 ? counts.activeLoans : counts.acceptedOffers,
            acceptedOfferCount: counts.acceptedOffers,
            activeLoanCount: counts.activeLoans,
          }))
          .filter(
            (row) =>
              row.completedApplicationCount > 0 ||
              row.acceptedOfferCount > 0 ||
              row.activeLoanCount > 0,
          );

      return {
        id: entry.id,
        displayName: entry.displayName,
        shortId: getShortId(entry.id),
        completedApplicationCount,
        acceptedOfferCount: entry.acceptedOfferCount,
        activeLoanCount: entry.activeLoanCount,
        href: `/manager/users/${entry.id}`,
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

function buildBorrowerPerformanceFromRpc(
  rows: Array<{
    borrower_id: string;
    display_name: string;
    status: string;
    accepted_application_count: number | bigint;
    verified_repayment_count: number | bigint;
    active_loan_count: number | bigint;
    paid_loan_count: number | bigint;
    rejected_proof_count: number | bigint;
    overdue_defaulted_loan_count: number | bigint;
    credit_profile_grade: string | null;
  }>,
): ManagerBorrowerPerformanceRow[] {
  return rows
    .map((row) => {
      const acceptedApplicationCount = Number(row.accepted_application_count);
      const verifiedRepaymentCount = Number(row.verified_repayment_count);
      const activeLoanCount = Number(row.active_loan_count);
      const paidLoanCount = Number(row.paid_loan_count);
      const rejectedProofCount = Number(row.rejected_proof_count);
      const overdueDefaultedLoanCount = Number(
        row.overdue_defaulted_loan_count,
      );
      const riskFlagCount = rejectedProofCount + overdueDefaultedLoanCount;

      return {
        id: row.borrower_id,
        displayName: row.display_name,
        shortId: getShortId(row.borrower_id),
        previewScore: calculateBorrowerReadinessScore({
          acceptedApplicationCount,
          verifiedRepaymentCount,
          activeLoanCount,
          paidLoanCount,
          rejectedProofCount,
          overdueDefaultedLoanCount,
        }),
        creditProfileGrade: row.credit_profile_grade,
        status: row.status as ProfileStatus,
        acceptedApplicationCount,
        verifiedRepaymentCount,
        riskFlagCount,
        activeLoanCount,
        paidLoanCount,
        href: `/manager/users/${row.borrower_id}`,
      };
    })
    .sort(
      (a, b) =>
        b.previewScore - a.previewScore ||
        b.verifiedRepaymentCount - a.verifiedRepaymentCount ||
        a.displayName.localeCompare(b.displayName),
    )
    .slice(0, 6);
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

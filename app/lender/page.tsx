import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/login/actions";
import { DismissibleLenderStatusBanner } from "@/components/dismissible-lender-status-banner";
import { LenderBottomTabs, LenderHeader } from "@/components/lender-bottom-tabs";
import {
  formatCurrency,
  formatDate,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { LenderVerificationDocumentsPanel } from "@/components/lender-verification-documents-panel";
import {
  getCurrentUserProfile,
  type CurrentUserProfile,
} from "@/lib/access-control";
import {
  buildConsentStatus,
  type UserConsentRecord,
} from "@/lib/consents";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { LenderRepaymentProofActions } from "@/components/lender-repayment-proof-actions";
import {
  loadLenderOffers,
  loadOpenLenderApplications,
  type LenderApplicationReview,
  type LenderOfferReview,
} from "@/lib/lender-applications";
import { isApprovedLender } from "@/lib/role-rules";
import type { ActiveLoanSummary } from "@/lib/active-loans";
import {
  getLenderVerificationStatus,
  type LenderVerificationSummary,
} from "@/lib/lender-verification";
import type { ConsentStatus } from "@/lib/consents";

export const dynamic = "force-dynamic";

type LenderPageProps = {
  searchParams: Promise<{
    message?: string;
    tab?: string;
    profileTab?: string;
    loanSearch?: string;
  }>;
};

type LenderProfileTab =
  | "index"
  | "organization"
  | "lending-scope"
  | "verification"
  | "account"
  | "support";

function resolveLenderProfileTab(value?: string): LenderProfileTab {
  if (
    value === "organization" ||
    value === "lending-scope" ||
    value === "verification" ||
    value === "account" ||
    value === "support"
  ) {
    return value;
  }

  return "index";
}

export default async function LenderPage({ searchParams }: LenderPageProps) {
  const { message, tab, profileTab, loanSearch = "" } = await searchParams;

  if (message === "signed-in") {
    redirect("/lender");
  }

  const access = await getCurrentUserProfile();
  const approvedOperationalTab =
    tab === "offers" || tab === "account" ? tab : "home";

  if (!access.ok) {
    return (
      <main className="min-h-svh px-5 pt-4 pb-36 sm:px-8 sm:pt-6">
        <div className="mx-auto grid max-w-4xl gap-5">
          <LenderHeader showAccountLink={false} showNotifications={false} />
          <LenderApplicationsStatus message={access.message} tone="error" />
          <LenderBottomTabs activeTab={approvedOperationalTab} />
        </div>
      </main>
    );
  }

  if (!isApprovedLender(access.profile)) {
    if (access.profile.role === "lender" && tab === "account") {
      redirect("/lender?profileTab=account");
    }

    if (access.profile.role === "lender" && tab === "offers") {
      redirect("/lender?profileTab=verification");
    }

    const lenderConsentStatus = buildConsentStatus(
      "lender_review",
      await loadUserConsents(access.supabase, access.profile.id),
    );
    const {
      data: { user },
    } = await access.supabase.auth.getUser();
    const lenderVerification =
      access.profile.role === "lender"
        ? await getLenderVerificationStatus(access.supabase, access.profile.id)
        : null;
    const lenderProfileTab = resolveLenderProfileTab(profileTab);
    const message =
      access.profile.role === "lender" &&
      access.profile.lenderProfile?.verification_status === "pending"
        ? "Your lender access is pending review. You will be able to continue when your account is approved."
        : access.profile.role === "lender" &&
            access.profile.lenderProfile?.verification_status === "rejected"
          ? "Your lender access was not approved."
          : "Your account does not have access to this workspace.";

    return (
      <main className="min-h-svh px-5 pt-4 pb-36 sm:px-8 sm:pt-6">
        <div className="mx-auto grid max-w-4xl gap-5">
          <LenderHeader
            accountHref="/lender?profileTab=account"
            showAccountLink={access.profile.role === "lender"}
            showNotifications={false}
          />
          {access.profile.role === "lender" ? (
            <LenderProfileCompletionShell
              email={user?.email ?? ""}
              access={access.profile}
              profileTab={lenderProfileTab}
              consentStatus={lenderConsentStatus}
              verification={lenderVerification}
              profileBaseHref="/lender"
              indexHref="/lender?profileTab=index"
              isLimited
            />
          ) : (
            <LenderApplicationsStatus message={message} tone="error" />
          )}
        </div>
      </main>
    );
  }

  const [
    applicationsResult,
    offersResult,
    {
      data: { user },
    },
    lenderConsentRecords,
    lenderVerification,
  ] = await Promise.all([
    loadOpenLenderApplications(access),
    loadLenderOffers(access),
    access.supabase.auth.getUser(),
    loadUserConsents(access.supabase, access.profile.id),
    getLenderVerificationStatus(access.supabase, access.profile.id),
  ]);
  const applications = applicationsResult.ok ? applicationsResult.applications : [];
  const offers = offersResult.ok ? offersResult.offers : [];
  const lenderConsentStatus = buildConsentStatus(
    "lender_review",
    lenderConsentRecords,
  );
  const approvedProfileTab =
    approvedOperationalTab === "account"
      ? resolveLenderProfileTab(profileTab)
      : "index";

  return (
    <main className="min-h-svh px-5 pt-4 pb-36 sm:px-8 sm:pt-6">
      <div className="mx-auto grid max-w-6xl gap-5">
        <LenderHeader showAccountLink={approvedOperationalTab !== "account"} />

        {approvedOperationalTab === "home" ? (
          <HomeTab
            applications={applications}
            offers={offers}
            loanSearch={loanSearch}
            applicationsError={!applicationsResult.ok ? applicationsResult.message : ""}
            offersError={!offersResult.ok ? offersResult.message : ""}
          />
        ) : null}

        {approvedOperationalTab === "offers" ? (
          <OffersTab offers={offers} error={!offersResult.ok ? offersResult.message : ""} />
        ) : null}

        {approvedOperationalTab === "account" ? (
          <LenderProfileCompletionShell
            email={user?.email ?? ""}
            access={access.profile}
            profileTab={approvedProfileTab}
            consentStatus={lenderConsentStatus}
            verification={lenderVerification}
            profileBaseHref="/lender?tab=account"
            indexHref="/lender?tab=account"
            isLimited={false}
          />
        ) : null}

        <LenderBottomTabs activeTab={approvedOperationalTab} />
      </div>
    </main>
  );
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

function HomeTab({
  applications,
  offers,
  loanSearch,
  applicationsError,
  offersError,
}: {
  applications: LenderApplicationReview[];
  offers: LenderOfferReview[];
  loanSearch: string;
  applicationsError: string;
  offersError: string;
}) {
  const needsReviewCount = applications.filter(
    (application) => application.currentLenderOfferState === "not_offered",
  ).length;
  const repaymentProofsNeedingReview = offers.reduce(
    (count, offer) =>
      count +
      (offer.activeLoan?.schedule.filter(
        (repayment) => repayment.latestProof?.status === "submitted",
      ).length ?? 0),
    0,
  );
  const dashboardLoans = getUniqueActiveLoansFromOffers(offers);
  const metrics = buildLenderDashboardMetrics(dashboardLoans);
  const calendarDays = buildRepaymentCalendarDays(dashboardLoans);
  const ratingTrend = buildRatingTrend(dashboardLoans);
  const filteredLoans = filterDashboardLoans(dashboardLoans, loanSearch);
  const progressPercent =
    metrics.averageMonthlyRevenue > 0
      ? Math.min(100, (metrics.currentMonthRevenue / metrics.averageMonthlyRevenue) * 100)
      : 0;

  return (
    <section className="grid gap-4">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[#f7f8f5] p-3 text-[var(--foreground)] shadow-2xl shadow-black/5 sm:p-4">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
            <div>
              <h1 className="text-xl font-semibold tracking-normal">Lender dashboard</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Active portfolio, repayments, and borrower follow-ups.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1.5">
                {needsReviewCount} new
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1.5">
                {repaymentProofsNeedingReview} proofs
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <DashboardKpiCard
              label="Total month's revenue"
              value={formatPhp(metrics.currentMonthRevenue)}
              helper="Verified this month"
              percentChange={metrics.revenueChangePercent}
            />
            <DashboardKpiCard
              label="This month's active loans"
              value={metrics.currentMonthActiveLoans.toString()}
              helper="Active or overdue"
              percentChange={metrics.activeLoansChangePercent}
            />
            <DashboardKpiCard
              label="Avg. loans per month"
              value={formatCompactNumber(metrics.averageLoanStartsPerMonth)}
              helper="New active loan starts"
              percentChange={metrics.loanStartsChangePercent}
            />
          </div>

          <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DashboardPanel title="Total revenue">
              <div className="grid gap-4">
                <div>
                  <p className="text-3xl font-semibold">
                    {formatPhp(metrics.totalVerifiedRevenue)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Verified repayments across loaded active loans.
                  </p>
                </div>
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]/50">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-[var(--muted-foreground)]">
                    {formatPhp(metrics.currentMonthRevenue)} of{" "}
                    {formatPhp(metrics.averageMonthlyRevenue)} average monthly revenue
                  </p>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Customer rating">
              <RatingTrendChart trend={ratingTrend} />
            </DashboardPanel>

            <DashboardPanel title="Repayment calendar">
              <RepaymentCalendar days={calendarDays} />
            </DashboardPanel>
          </div>

          <DashboardPanel
            title="Active loans"
            action={
              <form action="/lender" className="w-full sm:w-72">
                <input type="hidden" name="tab" value="home" />
                <label className="sr-only" htmlFor="loanSearch">
                  Search active loans
                </label>
                <input
                  id="loanSearch"
                  name="loanSearch"
                  type="search"
                  defaultValue={loanSearch}
                  placeholder="Search loans"
                  className="h-10 w-full rounded-full border border-[var(--border)] bg-white px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--subtle-foreground)] focus:border-emerald-300/60"
                />
              </form>
            }
          >
            <ActiveLoansTable
              loans={filteredLoans}
              hasLoans={dashboardLoans.length > 0}
              searchQuery={loanSearch}
            />
          </DashboardPanel>
        </div>
      </div>

      {applicationsError ? (
        <LenderApplicationsStatus message={applicationsError} tone="error" />
      ) : null}
      {offersError ? <LenderApplicationsStatus message={offersError} tone="error" /> : null}
    </section>
  );
}

type DashboardLoan = {
  loan: ActiveLoanSummary;
  offer: LenderOfferReview;
  context: string;
  location: string;
  purpose: string;
};

type DashboardMetrics = {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  revenueChangePercent: number;
  currentMonthActiveLoans: number;
  previousMonthActiveLoans: number;
  activeLoansChangePercent: number;
  averageLoanStartsPerMonth: number;
  previousAverageLoanStartsPerMonth: number;
  loanStartsChangePercent: number;
  totalVerifiedRevenue: number;
  averageMonthlyRevenue: number;
};

type CalendarRepayment = {
  id: string;
  amountDue: number;
  dueDate: string;
  status: string;
  context: string;
  isLate: boolean;
};

type CalendarDay = {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  repayments: CalendarRepayment[];
};

type RatingTrendPoint = {
  monthLabel: string;
  rating: number | null;
  verified: number;
  total: number;
};

export function getMonthRange(value: Date) {
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

export function getPreviousMonthRange(value: Date) {
  return getMonthRange(new Date(value.getFullYear(), value.getMonth() - 1, 1));
}

export function getPercentageChange(current: number, previous: number) {
  if (previous === 0 && current > 0) {
    return 100;
  }

  if (previous === 0 && current === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

export function formatPercentChange(value: number) {
  if (value === 0) {
    return "0%";
  }

  const formatted = new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(Math.abs(value));

  return `${value > 0 ? "+" : "-"}${formatted}%`;
}

export function getUniqueActiveLoansFromOffers(
  offers: LenderOfferReview[],
): DashboardLoan[] {
  const loansById = new Map<string, DashboardLoan>();

  offers.forEach((offer) => {
    if (!offer.activeLoan || loansById.has(offer.activeLoan.id)) {
      return;
    }

    const portfolio = offer.application?.portfolio;
    const context = portfolio
      ? `${portfolio.businessTypeLabel} in ${portfolio.location}`
      : "Borrower business";

    loansById.set(offer.activeLoan.id, {
      loan: offer.activeLoan,
      offer,
      context,
      location: portfolio?.location ?? "",
      purpose: offer.application?.purpose ?? "",
    });
  });

  return [...loansById.values()];
}

export function buildLenderDashboardMetrics(
  loans: DashboardLoan[],
  today = new Date(),
): DashboardMetrics {
  const currentMonth = getMonthRange(today);
  const previousMonth = getPreviousMonthRange(today);
  const previousSixMonthStart = new Date(
    today.getFullYear(),
    today.getMonth() - 11,
    1,
  );
  const currentSixMonthStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const previousSixMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth() - 6,
    0,
    23,
    59,
    59,
    999,
  );

  const currentMonthRevenue = sumVerifiedRevenueInRange(loans, currentMonth);
  const previousMonthRevenue = sumVerifiedRevenueInRange(loans, previousMonth);
  const currentMonthActiveLoans = countLoansOverlappingRange(loans, currentMonth);
  const previousMonthActiveLoans = countLoansOverlappingRange(loans, previousMonth);
  const totalVerifiedRevenue = loans.reduce(
    (sum, item) =>
      sum +
      item.loan.schedule.reduce(
        (scheduleSum, repayment) =>
          repayment.status === "verified"
            ? scheduleSum + repayment.amountDue
            : scheduleSum,
        0,
      ),
    0,
  );
  const averageMonthlyRevenue = buildMonthlyRevenueTotals(
    loans,
    currentSixMonthStart,
    currentMonth.end,
  ).reduce((sum, total) => sum + total, 0) / 6;
  const averageLoanStartsPerMonth =
    countLoanStartsInRange(loans, currentSixMonthStart, currentMonth.end) / 6;
  const previousAverageLoanStartsPerMonth =
    countLoanStartsInRange(loans, previousSixMonthStart, previousSixMonthEnd) / 6;

  return {
    currentMonthRevenue,
    previousMonthRevenue,
    revenueChangePercent: getPercentageChange(
      currentMonthRevenue,
      previousMonthRevenue,
    ),
    currentMonthActiveLoans,
    previousMonthActiveLoans,
    activeLoansChangePercent: getPercentageChange(
      currentMonthActiveLoans,
      previousMonthActiveLoans,
    ),
    averageLoanStartsPerMonth,
    previousAverageLoanStartsPerMonth,
    loanStartsChangePercent: getPercentageChange(
      averageLoanStartsPerMonth,
      previousAverageLoanStartsPerMonth,
    ),
    totalVerifiedRevenue,
    averageMonthlyRevenue,
  };
}

export function buildRepaymentCalendarDays(
  loans: DashboardLoan[],
  today = new Date(),
): CalendarDay[] {
  const month = getMonthRange(today);
  const firstDay = month.start.getDay();
  const gridStart = new Date(month.start);
  gridStart.setDate(month.start.getDate() - firstDay);
  const repaymentGroups = groupRepaymentsByDate(loans);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toDateKey(date);

    return {
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === today.getMonth(),
      repayments: repaymentGroups.get(key) ?? [],
    };
  });
}

export function buildRatingTrend(
  loans: DashboardLoan[],
  today = new Date(),
): RatingTrendPoint[] {
  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const range = getMonthRange(monthDate);
    const repayments = getRepaymentsInRange(loans, range);
    const verified = repayments.filter(
      (repayment) => repayment.status === "verified",
    ).length;

    return {
      monthLabel: new Intl.DateTimeFormat("en-PH", { month: "short" }).format(
        monthDate,
      ),
      rating: repayments.length > 0 ? (verified / repayments.length) * 5 : null,
      verified,
      total: repayments.length,
    };
  });
}

function DashboardKpiCard({
  label,
  value,
  helper,
  percentChange,
}: {
  label: string;
  value: string;
  helper: string;
  percentChange: number;
}) {
  const isPositive = percentChange > 0;
  const isNegative = percentChange < 0;

  return (
    <div className="relative min-h-36 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--subtle-foreground)]">
        {label}
      </p>
      <p className="mt-5 text-3xl font-semibold tracking-normal">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{helper}</p>
      <span
        className={`absolute right-4 bottom-4 rounded-full px-2.5 py-1 text-xs font-semibold ${
          isPositive
            ? "bg-emerald-400/15 text-emerald-300"
            : isNegative
              ? "bg-rose-400/15 text-rose-300"
              : "bg-[var(--muted)]/50 text-[var(--muted-foreground)]"
        }`}
      >
        {formatPercentChange(percentChange)}
      </span>
    </div>
  );
}

function DashboardPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="h-full rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function RatingTrendChart({ trend }: { trend: RatingTrendPoint[] }) {
  const points = trend
    .map((point, index) => ({ ...point, index }))
    .filter((point) => point.rating !== null);

  if (points.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 text-center text-sm leading-6 text-[var(--muted-foreground)]">
        No repayment history yet.
      </div>
    );
  }

  const width = 360;
  const height = 150;
  const padding = 18;
  const getX = (index: number) =>
    padding + (index / Math.max(1, trend.length - 1)) * (width - padding * 2);
  const getY = (rating: number) =>
    height - padding - (rating / 5) * (height - padding * 2);
  const linePath = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${getX(point.index)} ${getY(point.rating ?? 0)}`;
    })
    .join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L ${getX(points[points.length - 1].index)} ${height - padding} L ${getX(points[0].index)} ${height - padding} Z`
      : "";
  const latestRating = points[points.length - 1].rating ?? 0;

  return (
    <div className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold">{latestRating.toFixed(1)}</p>
          <p className="text-sm text-[var(--muted-foreground)]">Latest repayment-based score</p>
        </div>
        <p className="text-xs font-semibold text-[var(--subtle-foreground)]">Out of 5.0</p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Repayment-based customer rating trend"
        className="h-40 w-full overflow-visible"
      >
        <defs>
          <linearGradient id="ratingArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[1, 2, 3, 4, 5].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={getY(line)}
            y2={getY(line)}
            stroke="rgba(95, 95, 95, 0.16)"
          />
        ))}
        {areaPath ? <path d={areaPath} fill="url(#ratingArea)" /> : null}
        {points.length > 1 ? (
          <path
            d={linePath}
            fill="none"
            stroke="#34d399"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        ) : null}
        {points.map((point) => (
          <circle
            key={`${point.monthLabel}-${point.index}`}
            cx={getX(point.index)}
            cy={getY(point.rating ?? 0)}
            r="4"
            fill="#34d399"
            stroke="#f7f8f5"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="grid grid-cols-6 gap-1 text-center text-[0.68rem] font-semibold text-[var(--subtle-foreground)]">
        {trend.map((point) => (
          <span key={point.monthLabel}>{point.monthLabel}</span>
        ))}
      </div>
    </div>
  );
}

function RepaymentCalendar({ days }: { days: CalendarDay[] }) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const upcoming = days
    .filter((day) => day.isCurrentMonth)
    .flatMap((day) => day.repayments)
    .filter((repayment) => repayment.dueDate >= todayKey)
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
    .slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr] xl:grid-cols-1">
      <div>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase text-[var(--subtle-foreground)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const hasRepayments = day.repayments.length > 0;
            const hasLate = day.repayments.some((repayment) => repayment.isLate);
            const isToday = toDateKey(day.date) === todayKey;

            return (
              <div
                key={day.date.toISOString()}
                className={`aspect-square rounded-xl border p-1.5 text-xs ${
                  day.isCurrentMonth
                    ? "border-[var(--border)] bg-white text-[var(--foreground)]"
                    : "border-transparent bg-transparent text-[var(--subtle-foreground)] opacity-50"
                } ${isToday ? "ring-1 ring-emerald-300/70" : ""}`}
              >
                <span>{day.dayNumber}</span>
                {hasRepayments ? (
                  <span
                    className={`mt-1 block h-1.5 w-1.5 rounded-full ${
                      hasLate ? "bg-rose-300" : "bg-emerald-300"
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        {upcoming.length > 0 ? (
          upcoming.map((repayment) => (
            <div
              key={repayment.id}
              className={`rounded-2xl border px-3 py-2 ${
                repayment.isLate
                  ? "border-rose-300/20 bg-rose-300/10"
                  : "border-[var(--border)] bg-[var(--muted)]/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {formatDateOnly(repayment.dueDate)}
                </p>
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                  {formatPhp(repayment.amountDue)}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">
                {repayment.context}
              </p>
              <p className="mt-1 text-xs font-semibold capitalize text-[var(--subtle-foreground)]">
                {formatRepaymentStatus(repayment.status)}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-5 text-center text-sm text-[var(--muted-foreground)]">
            No upcoming repayments this month.
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveLoansTable({
  loans,
  hasLoans,
  searchQuery,
}: {
  loans: DashboardLoan[];
  hasLoans: boolean;
  searchQuery: string;
}) {
  if (!hasLoans) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
        Active loans will appear here after borrowers accept offers.
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
        No active loans match &quot;{searchQuery}&quot;.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20">
      <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-[var(--border)] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--subtle-foreground)] lg:grid">
        <span>Borrower</span>
        <span>Principal</span>
        <span>Repayment</span>
        <span>Outstanding</span>
        <span>Due date</span>
        <span>Status</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {loans.map((item) => (
          <div
            key={item.loan.id}
            className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] lg:items-center"
          >
            <div>
              <p className="font-semibold text-[var(--foreground)]">{item.context}</p>
              <p className="mt-1 line-clamp-1 text-xs text-[var(--subtle-foreground)]">
                {item.purpose || "Accepted offer"}
              </p>
            </div>
            <LoanMobileMetric label="Principal" value={formatPhp(item.loan.principalAmount)} />
            <LoanMobileMetric label="Repayment" value={formatPhp(item.loan.repaymentAmount)} />
            <LoanMobileMetric
              label="Outstanding"
              value={formatPhp(item.loan.outstandingBalance)}
            />
            <LoanMobileMetric label="Due date" value={formatDateOnly(item.loan.dueDate)} />
            <div className="flex items-center justify-between gap-3 lg:block">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--subtle-foreground)] lg:hidden">
                Status
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  item.loan.status === "overdue"
                    ? "bg-rose-400/15 text-rose-300"
                    : "bg-emerald-400/15 text-emerald-300"
                }`}
              >
                {item.loan.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoanMobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:block">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--subtle-foreground)] lg:hidden">
        {label}
      </span>
      <span className="font-semibold text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function filterDashboardLoans(loans: DashboardLoan[], searchQuery: string) {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return loans;
  }

  return loans.filter((item) => {
    const repaymentDates = item.loan.schedule
      .map((repayment) => formatDateOnly(repayment.dueDate))
      .join(" ");
    const haystack = [
      item.context,
      item.location,
      item.purpose,
      item.loan.status,
      item.loan.principalAmount.toString(),
      item.loan.repaymentAmount.toString(),
      item.loan.outstandingBalance.toString(),
      item.loan.dueDate,
      formatDateOnly(item.loan.dueDate),
      repaymentDates,
      formatPhp(item.loan.principalAmount),
      formatPhp(item.loan.repaymentAmount),
      formatPhp(item.loan.outstandingBalance),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function sumVerifiedRevenueInRange(
  loans: DashboardLoan[],
  range: { start: Date; end: Date },
) {
  return getRepaymentsInRange(loans, range).reduce(
    (sum, repayment) =>
      repayment.status === "verified" ? sum + repayment.amountDue : sum,
    0,
  );
}

function countLoansOverlappingRange(
  loans: DashboardLoan[],
  range: { start: Date; end: Date },
) {
  return loans.filter((item) => {
    if (item.loan.status !== "active" && item.loan.status !== "overdue") {
      return false;
    }

    const startedAt = new Date(item.loan.startedAt);
    const dueDate = parseDateOnly(item.loan.dueDate);

    return startedAt <= range.end && dueDate >= range.start;
  }).length;
}

function countLoanStartsInRange(loans: DashboardLoan[], start: Date, end: Date) {
  return loans.filter((item) => {
    const startedAt = new Date(item.loan.startedAt);

    return startedAt >= start && startedAt <= end;
  }).length;
}

function buildMonthlyRevenueTotals(
  loans: DashboardLoan[],
  start: Date,
  end: Date,
) {
  return Array.from({ length: 6 }, (_, index) => {
    const month = getMonthRange(
      new Date(start.getFullYear(), start.getMonth() + index, 1),
    );
    const cappedEnd = month.end > end ? end : month.end;

    return sumVerifiedRevenueInRange(loans, {
      start: month.start,
      end: cappedEnd,
    });
  });
}

function getRepaymentsInRange(
  loans: DashboardLoan[],
  range: { start: Date; end: Date },
) {
  return loans.flatMap((item) =>
    item.loan.schedule.filter((repayment) => {
      const dueDate = parseDateOnly(repayment.dueDate);

      return dueDate >= range.start && dueDate <= range.end;
    }),
  );
}

function groupRepaymentsByDate(loans: DashboardLoan[]) {
  const todayKey = toDateKey(new Date());

  return loans.reduce((groups, item) => {
    item.loan.schedule.forEach((repayment) => {
      const repayments = groups.get(repayment.dueDate) ?? [];
      groups.set(repayment.dueDate, [
        ...repayments,
        {
          id: repayment.id,
          amountDue: repayment.amountDue,
          dueDate: repayment.dueDate,
          status: repayment.status,
          context: item.context,
          isLate:
            repayment.status === "late" ||
            (repayment.dueDate < todayKey && repayment.status !== "verified"),
        },
      ]);
    });

    return groups;
  }, new Map<string, CalendarRepayment[]>());
}

function formatPhp(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 1,
  }).format(value);
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function OffersTab({
  offers,
  error,
}: {
  offers: LenderOfferReview[];
  error: string;
}) {
  const knownStatuses = new Set(["pending", "accepted", "declined", "expired"]);
  const groups = [
    { label: "Pending", offers: offers.filter((offer) => offer.status === "pending") },
    { label: "Accepted", offers: offers.filter((offer) => offer.status === "accepted") },
    { label: "Declined", offers: offers.filter((offer) => offer.status === "declined") },
    { label: "Expired", offers: offers.filter((offer) => offer.status === "expired") },
    {
      label: "Other",
      offers: offers.filter((offer) => !knownStatuses.has(offer.status)),
    },
  ];

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold">Offers</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Sent offers grouped by borrower response.
        </p>
      </div>

      {error ? <LenderApplicationsStatus message={error} tone="error" /> : null}

      {offers.length === 0 && !error ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-5 py-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold">No sent offers</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Sent offers will appear here.
          </p>
        </div>
      ) : null}

      {groups.map((group) =>
        group.offers.length > 0 ? (
          <div key={group.label} className="grid gap-3">
            <h2 className="text-sm font-semibold text-[var(--muted-foreground)]">
              {group.label}
            </h2>
            {group.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : null,
      )}
    </section>
  );
}

type LenderProfileStatusTone = "attention" | "ready" | "neutral";

type LenderProfileStatus = {
  title: string;
  description: string;
  action: string | null;
  actionProfileTab: LenderProfileTab | null;
  pill: string;
  tone: LenderProfileStatusTone;
};

function buildLenderProfileHref(
  baseHref: string,
  profileTab: LenderProfileTab,
) {
  if (profileTab === "index") return baseHref;

  const separator = baseHref.includes("?") ? "&" : "?";
  return `${baseHref}${separator}profileTab=${profileTab}`;
}

function LenderProfileCompletionShell({
  email,
  access,
  profileTab,
  consentStatus,
  verification,
  profileBaseHref,
  indexHref,
  isLimited,
}: {
  email: string;
  access: CurrentUserProfile;
  profileTab: LenderProfileTab;
  consentStatus: ConsentStatus;
  verification: LenderVerificationSummary | null;
  profileBaseHref: string;
  indexHref: string;
  isLimited: boolean;
}) {
  if (profileTab === "organization") {
    return <LenderOrganizationSubview access={access} backHref={indexHref} />;
  }

  if (profileTab === "lending-scope") {
    return <LenderScopeSubview access={access} backHref={indexHref} />;
  }

  if (profileTab === "verification") {
    return (
      <LenderVerificationSubview
        consentStatus={consentStatus}
        verification={verification}
        backHref={indexHref}
      />
    );
  }

  if (profileTab === "account") {
    return <LenderAccountSubview access={access} email={email} backHref={indexHref} />;
  }

  if (profileTab === "support") {
    return <LenderSupportSubview backHref={indexHref} />;
  }

  return (
    <LenderProfileHub
      email={email}
      access={access}
      verification={verification}
      profileBaseHref={profileBaseHref}
      isLimited={isLimited}
    />
  );
}

function LenderProfileHub({
  email,
  access,
  verification = null,
  profileBaseHref,
  isLimited = false,
}: {
  email: string;
  access: CurrentUserProfile;
  verification?: LenderVerificationSummary | null;
  profileBaseHref: string;
  isLimited?: boolean;
}) {
  const status = getLenderProfileStatus(access, verification);
  const lenderProfile = access.lenderProfile;
  const displayName =
    lenderProfile?.organization_name || access.display_name || "Lender profile";
  const initials = getLenderInitials(displayName);

  return (
    <section className="grid gap-4">
      <LenderProfileIndexHeader
        title={displayName}
        subtitle={email || "Signed in"}
        initials={initials}
      />

      <LenderProfileStatusBanner
        status={status}
        buildProfileHref={(targetTab) =>
          buildLenderProfileHref(profileBaseHref, targetTab)
        }
      />

      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        <LenderProfileMenuRow
          href={buildLenderProfileHref(profileBaseHref, "organization")}
          icon="organization"
          title="Organization Profile"
          description={
            hasMissingRequiredLenderOrganizationFields(lenderProfile)
              ? "Complete required organization details."
              : "Organization details are on file."
          }
          status={
            hasMissingRequiredLenderOrganizationFields(lenderProfile) ? (
              <LenderStatusPill tone="attention">Needs review</LenderStatusPill>
            ) : (
              <LenderStatusPill tone="ready">Complete</LenderStatusPill>
            )
          }
        />
        <LenderProfileMenuRow
          href={buildLenderProfileHref(profileBaseHref, "lending-scope")}
          icon="scope"
          title="Lending Scope"
          description={
            hasCompleteLendingScope(lenderProfile)
              ? formatLendingScope(lenderProfile)
              : "Add lending amounts, area, and repayment terms."
          }
          status={
            hasCompleteLendingScope(lenderProfile) ? (
              <LenderStatusPill tone="ready">Set</LenderStatusPill>
            ) : (
              <LenderStatusPill tone="attention">Missing</LenderStatusPill>
            )
          }
        />
        <LenderProfileMenuRow
          href={buildLenderProfileHref(profileBaseHref, "verification")}
          icon="verification"
          title="Verification"
          description={getVerificationDescription(access, verification)}
          status={
            <LenderStatusPill tone={status.tone}>{status.pill}</LenderStatusPill>
          }
        />
        <LenderProfileMenuRow
          href={buildLenderProfileHref(profileBaseHref, "account")}
          icon="account"
          title="Account"
          description={`Role: ${formatTitleCase(access.role)}`}
          status={
            <LenderStatusPill
              tone={access.status === "active" ? "ready" : "neutral"}
            >
              {formatTitleCase(access.status)}
            </LenderStatusPill>
          }
        />
        <LenderProfileMenuRow
          href={buildLenderProfileHref(profileBaseHref, "support")}
          icon="support"
          title="Help & Support"
          description={
            isLimited
              ? "Contact support if your lender review needs follow-up."
              : "Get help with lending activity and account updates."
          }
          status={<LenderStatusPill tone="neutral">Available</LenderStatusPill>}
        />
      </div>

      <form action={signOutAction}>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}

function LenderProfileIndexHeader({
  title,
  subtitle,
  initials,
}: {
  title: string;
  subtitle: string;
  initials: string;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-6 text-center shadow-sm">
      <div className="inline-flex size-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--muted)] text-2xl font-semibold text-[var(--foreground)]">
        {initials}
      </div>
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold">{title}</h1>
        <p className="break-words text-sm leading-6 text-[var(--muted-foreground)]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function LenderProfileStatusBanner({
  status,
  buildProfileHref,
}: {
  status: LenderProfileStatus;
  buildProfileHref: (profileTab: LenderProfileTab) => string;
}) {
  const actionHref = status.actionProfileTab
    ? buildProfileHref(status.actionProfileTab)
    : null;

  return (
    <DismissibleLenderStatusBanner
      title={status.title}
      description={status.description}
      pill={status.pill}
      tone={status.tone}
      action={status.action}
      actionHref={actionHref}
    />
  );
}

function LenderProfileMenuRow({
  href,
  icon,
  title,
  description,
  status,
}: {
  href: string;
  icon: "organization" | "scope" | "verification" | "account" | "support";
  title: string;
  description: string;
  status: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 transition hover:bg-[var(--muted)]/30 last:border-b-0 sm:px-5"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--foreground)]">
        <LenderProfileIcon icon={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          {status}
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4 shrink-0 text-[var(--subtle-foreground)]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}

function LenderStatusPill({
  tone,
  children,
}: {
  tone: LenderProfileStatusTone;
  children: ReactNode;
}) {
  const className =
    tone === "ready"
      ? "border border-[#ddd0bd] bg-[#eee7dc] text-[#241f1a]"
      : tone === "attention"
        ? "bg-[#f3e5c5] text-[#3a2d16]"
        : "bg-[var(--muted)] text-[var(--muted-foreground)]";

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function LenderProfileIcon({
  icon,
}: {
  icon: "organization" | "scope" | "verification" | "account" | "support";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {icon === "organization" ? (
        <>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-6h6v6" />
          <path d="M9 9h.01" />
          <path d="M15 9h.01" />
        </>
      ) : icon === "scope" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
        </>
      ) : icon === "verification" ? (
        <>
          <path d="M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      ) : icon === "account" ? (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 1 1 5.8 1c-.4 1.1-1.5 1.6-2.2 2.2-.5.4-.7.8-.7 1.8" />
          <path d="M12 17h.01" />
        </>
      )}
    </svg>
  );
}

function LenderProfileSubviewHeader({
  title,
  description,
  backHref,
}: {
  title: string;
  description: string;
  backHref: string;
}) {
  return (
    <div className="grid gap-3">
      <Link
        href={backHref}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </Link>
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold">{title}</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function LenderProfileDetailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <dl className="grid gap-1">{children}</dl>
    </section>
  );
}

function LenderProfileSummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-[var(--border)] py-3 last:border-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="break-words text-sm font-semibold text-[var(--foreground)]">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function LenderOrganizationSubview({
  access,
  backHref,
}: {
  access: CurrentUserProfile;
  backHref: string;
}) {
  const lenderProfile = access.lenderProfile;

  return (
    <section className="grid gap-4">
      <LenderProfileSubviewHeader
        title="Organization Profile"
        description="Review the organization details used for lender approval."
        backHref={backHref}
      />
      <LenderProfileDetailCard title="Organization details">
        <LenderProfileSummaryRow
          label="Organization name"
          value={lenderProfile?.organization_name}
        />
        <LenderProfileSummaryRow
          label="Contact person"
          value={lenderProfile?.contact_person}
        />
        <LenderProfileSummaryRow
          label="Phone number"
          value={lenderProfile?.phone_number}
        />
        <LenderProfileSummaryRow
          label="Business address"
          value={lenderProfile?.business_address}
        />
        <LenderProfileSummaryRow
          label="Registration number"
          value={lenderProfile?.business_registration_number}
        />
        <LenderProfileSummaryRow
          label="Verification status"
          value={formatTitleCase(lenderProfile?.verification_status ?? "pending")}
        />
        {lenderProfile?.manager_review_notes ? (
          <LenderProfileSummaryRow
            label="Manager notes"
            value={lenderProfile.manager_review_notes}
          />
        ) : null}
        {lenderProfile?.rejection_reason ? (
          <LenderProfileSummaryRow
            label="Rejection reason"
            value={lenderProfile.rejection_reason}
          />
        ) : null}
      </LenderProfileDetailCard>
    </section>
  );
}

function LenderScopeSubview({
  access,
  backHref,
}: {
  access: CurrentUserProfile;
  backHref: string;
}) {
  const lenderProfile = access.lenderProfile;

  return (
    <section className="grid gap-4">
      <LenderProfileSubviewHeader
        title="Lending Scope"
        description="Review the lending limits and borrower fit in your lender profile."
        backHref={backHref}
      />
      <LenderProfileDetailCard title="Scope details">
        <LenderProfileSummaryRow
          label="Operating area"
          value={lenderProfile?.operating_area}
        />
        <LenderProfileSummaryRow
          label="Minimum loan amount"
          value={
            lenderProfile ? formatPhp(lenderProfile.min_loan_amount) : undefined
          }
        />
        <LenderProfileSummaryRow
          label="Maximum loan amount"
          value={
            lenderProfile ? formatPhp(lenderProfile.max_loan_amount) : undefined
          }
        />
        <LenderProfileSummaryRow
          label="Repayment terms"
          value={lenderProfile?.typical_repayment_terms}
        />
        <LenderProfileSummaryRow
          label="Lender description"
          value={lenderProfile?.lender_description}
        />
      </LenderProfileDetailCard>
    </section>
  );
}

function LenderVerificationSubview({
  consentStatus,
  verification,
  backHref,
}: {
  consentStatus: ConsentStatus;
  verification: LenderVerificationSummary | null;
  backHref: string;
}) {
  return (
    <section className="grid gap-4">
      <LenderProfileSubviewHeader
        title="Verification"
        description="Upload and review the documents required for lender approval."
        backHref={backHref}
      />
      <LenderVerificationDocumentsPanel
        verification={verification}
        consentStatus={consentStatus}
      />
    </section>
  );
}

function LenderAccountSubview({
  access,
  email,
  backHref,
}: {
  access: CurrentUserProfile;
  email: string;
  backHref: string;
}) {
  const lenderProfile = access.lenderProfile;

  return (
    <section className="grid gap-4">
      <LenderProfileSubviewHeader
        title="Account"
        description="Review your lender account status."
        backHref={backHref}
      />
      <LenderProfileDetailCard title="Account details">
        <LenderProfileSummaryRow label="Role" value={formatTitleCase(access.role)} />
        <LenderProfileSummaryRow
          label="Account status"
          value={formatTitleCase(access.status)}
        />
        <LenderProfileSummaryRow
          label="Verification status"
          value={formatTitleCase(lenderProfile?.verification_status ?? "pending")}
        />
        <LenderProfileSummaryRow
          label="Organization"
          value={lenderProfile?.organization_name}
        />
        <LenderProfileSummaryRow label="Email" value={email || "Signed in"} />
      </LenderProfileDetailCard>
      <form action={signOutAction}>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}

function LenderSupportSubview({ backHref }: { backHref: string }) {
  return (
    <section className="grid gap-4">
      <LenderProfileSubviewHeader
        title="Help & Support"
        description="Get help with lender verification and account access."
        backHref={backHref}
      />
      <section className="grid gap-2 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
        <h2 className="text-lg font-semibold">Lender support</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          For lender verification or account questions, contact the LendFolio
          support team with your organization name and registered email.
        </p>
      </section>
    </section>
  );
}

function OfferCard({ offer }: { offer: LenderOfferReview }) {
  const isQuiet = offer.status !== "pending";
  const activeLoan = offer.activeLoan;
  const context = offer.application?.portfolio
    ? `${offer.application.portfolio.businessTypeLabel} in ${offer.application.portfolio.location}`
    : "Application context unavailable";

  return (
    <article
      className={`rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm ${
        isQuiet ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="font-semibold">{context}</h3>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {offer.application?.purpose ?? "Offer sent"}
          </p>
        </div>
        <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
          {offer.status}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {offer.application ? (
          <MiniMetric
            label="Requested"
            value={`PHP ${formatCurrency(offer.application.requestedAmount)}`}
          />
        ) : null}
        <MiniMetric
          label="Approved"
          value={`PHP ${formatCurrency(offer.approvedAmount)}`}
        />
        <MiniMetric
          label="Repayment"
          value={`PHP ${formatCurrency(offer.repaymentAmount)}`}
        />
        {offer.application ? (
          <MiniMetric label="Submitted" value={formatDate(offer.application.submittedAt)} />
        ) : null}
        <MiniMetric label="Due" value={formatDateOnly(offer.dueDate)} />
        <MiniMetric label="Sent" value={formatDate(offer.sentAt)} />
      </dl>
      {activeLoan ? (
        <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Active loan
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                activeLoan.status === "overdue"
                  ? "bg-[#fff4f4] text-[#8f1d1d]"
                  : "bg-[#e1f5ee] text-[#0f5f45]"
              }`}
            >
              {activeLoan.status}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <MiniMetric
              label="Principal"
              value={`PHP ${formatCurrency(activeLoan.principalAmount)}`}
            />
            <MiniMetric
              label="Repayment"
              value={`PHP ${formatCurrency(activeLoan.repaymentAmount)}`}
            />
            <MiniMetric
              label="Outstanding"
              value={`PHP ${formatCurrency(activeLoan.outstandingBalance)}`}
            />
            <MiniMetric label="Due" value={formatDateOnly(activeLoan.dueDate)} />
          </dl>
          {activeLoan.schedule.length > 0 ? (
            <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-4">
              <h4 className="text-sm font-semibold">Repayment schedule</h4>
              {activeLoan.schedule.map((repayment) => {
                const latestProof = repayment.latestProof;
                const currentSubmittedProof =
                  latestProof?.status === "submitted" ? latestProof : null;

                return (
                  <div
                    key={repayment.id}
                    className="grid gap-3 border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0"
                  >
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <MiniMetric
                        label="Installment"
                        value={`#${repayment.installmentNumber}`}
                      />
                      <MiniMetric
                        label="Amount due"
                        value={`PHP ${formatCurrency(repayment.amountDue)}`}
                      />
                      <MiniMetric
                        label="Due"
                        value={formatDateOnly(repayment.dueDate)}
                      />
                      <MiniMetric
                        label="Repayment"
                        value={formatRepaymentStatus(repayment.status)}
                      />
                      <MiniMetric
                        label="Proof"
                        value={
                          latestProof
                            ? formatProofStatus(latestProof.status)
                            : "Not submitted"
                        }
                      />
                    </dl>
                    {latestProof ? (
                      <ProofReviewState
                        proofStatus={latestProof.status}
                        reviewNotes={latestProof.reviewNotes}
                      />
                    ) : (
                      <p className="rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--muted-foreground)]">
                        Waiting for the borrower to upload proof for this installment.
                      </p>
                    )}
                    {repayment.proofs.length > 0 ? (
                      <LenderProofHistory
                        currentSubmittedProofId={currentSubmittedProof?.id ?? null}
                        proofs={repayment.proofs}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function LenderProofHistory({
  currentSubmittedProofId,
  proofs,
}: {
  currentSubmittedProofId: string | null;
  proofs: NonNullable<LenderOfferReview["activeLoan"]>["schedule"][number]["proofs"];
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-3">
      <p className="text-sm font-semibold">Proof attempts</p>
      {proofs.map((proof) => (
        <div
          key={proof.id}
          className="grid gap-2 border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid gap-1">
              <p className="break-words text-sm font-semibold">{proof.fileName}</p>
              <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                Submitted {formatDate(proof.submittedAt)}
                {proof.reviewedAt ? ` · Reviewed ${formatDate(proof.reviewedAt)}` : ""}
              </p>
            </div>
            <ProofStatusBadge status={proof.status} />
          </div>
          {proof.reviewNotes ? (
            <p className="rounded-xl bg-[var(--muted)]/50 px-3 py-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {proof.reviewNotes}
            </p>
          ) : null}
          {proof.id === currentSubmittedProofId ? (
            <LenderRepaymentProofActions
              proofId={proof.id}
              proofStatus={proof.status}
              proofUrl={proof.viewUrl}
            />
          ) : proof.viewUrl ? (
            <a
              href={proof.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
            >
              View proof
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ProofReviewState({
  proofStatus,
  reviewNotes,
}: {
  proofStatus: string;
  reviewNotes: string | null;
}) {
  if (proofStatus === "submitted") {
    return (
      <p className="rounded-2xl border border-[#d8dde8] bg-[#f7f9fc] px-3 py-2 text-sm leading-6 text-[var(--foreground)]">
        Review the submitted proof, then verify the repayment or reject it with a note.
      </p>
    );
  }

  if (proofStatus === "verified") {
    return (
      <p className="rounded-2xl border border-[#c8e6d8] bg-[#f1fbf6] px-3 py-2 text-sm leading-6 text-[#0f5f45]">
        Proof verified. This installment is marked paid.
      </p>
    );
  }

  if (proofStatus === "rejected") {
    return (
      <p className="rounded-2xl border border-[#f3c7c7] bg-[#fff4f4] px-3 py-2 text-sm leading-6 text-[#8f1d1d]">
        Proof rejected. The borrower can upload a corrected proof.
        {reviewNotes ? ` Note: ${reviewNotes}` : ""}
      </p>
    );
  }

  return null;
}

function ProofStatusBadge({ status }: { status: string }) {
  const className =
    status === "rejected"
      ? "bg-[#fff4f4] text-[#8f1d1d]"
      : status === "verified"
        ? "bg-[#e1f5ee] text-[#0f5f45]"
        : "bg-[#f7f9fc] text-[var(--foreground)]";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {formatProofStatus(status)}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

type LenderProfile = CurrentUserProfile["lenderProfile"];

export function getLenderProfileStatus(
  access: Pick<CurrentUserProfile, "lenderProfile">,
  verification: LenderVerificationSummary | null = null,
): LenderProfileStatus {
  const lenderProfile = access.lenderProfile;

  if (!lenderProfile) {
    return {
      title: "Profile needs review",
      description: "Complete your lender profile before manager review can start.",
      action: "Update profile details",
      actionProfileTab: "organization",
      pill: "Needs review",
      tone: "attention",
    };
  }

  if (lenderProfile.verification_status === "approved") {
    return {
      title: "Ready to lend",
      description: "Your lender profile is approved for borrower application review.",
      action: null,
      actionProfileTab: null,
      pill: "Ready",
      tone: "ready",
    };
  }

  if (lenderProfile.verification_status === "rejected") {
    return {
      title: "Verification needs updates",
      description:
        lenderProfile.rejection_reason ||
        "Review the lender verification feedback before resubmitting.",
      action: "Review documents",
      actionProfileTab: "verification",
      pill: "Needs updates",
      tone: "attention",
    };
  }

  if (hasMissingRequiredLenderOrganizationFields(lenderProfile)) {
    return {
      title: "Profile needs review",
      description: "Some required lender profile details are missing.",
      action: "Update profile details",
      actionProfileTab: "organization",
      pill: "Needs review",
      tone: "attention",
    };
  }

  if (!hasCompleteLendingScope(lenderProfile)) {
    return {
      title: "Lending scope needed",
      description: "Add lending amounts, area, and repayment terms.",
      action: "Update lending scope",
      actionProfileTab: "lending-scope",
      pill: "Missing",
      tone: "attention",
    };
  }

  if (hasMissingRequiredLenderDocuments(verification)) {
    return {
      title: "Verification required",
      description: "Upload required documents so managers can review your account.",
      action: "Upload documents",
      actionProfileTab: "verification",
      pill: "Required",
      tone: "attention",
    };
  }

  if (lenderProfile.verification_status === "pending") {
    return {
      title: "Waiting for manager review",
      description: "Your lender profile is submitted and awaiting manager review.",
      action: null,
      actionProfileTab: null,
      pill: "Pending",
      tone: "attention",
    };
  }

  return {
    title: "Profile unavailable",
    description: "Lender profile status is unavailable right now.",
    action: null,
    actionProfileTab: null,
    pill: "Unavailable",
    tone: "neutral",
  };
}

function hasMissingRequiredLenderOrganizationFields(lenderProfile: LenderProfile) {
  if (!lenderProfile) {
    return true;
  }

  return (
    !hasText(lenderProfile.organization_name) ||
    !hasText(lenderProfile.contact_person) ||
    !hasText(lenderProfile.phone_number) ||
    !hasText(lenderProfile.business_address)
  );
}

function hasMissingRequiredLenderDocuments(
  verification: LenderVerificationSummary | null,
) {
  return (
    !verification ||
    verification.status === "missing" ||
    verification.documentPolicy.requiredDocumentTypes.some(
      (documentType) =>
        !verification.documentPolicy.submittedDocumentTypes.includes(
          documentType,
        ),
    )
  );
}

function hasCompleteLendingScope(lenderProfile: LenderProfile) {
  return Boolean(
    lenderProfile &&
      hasText(lenderProfile.operating_area) &&
      hasText(lenderProfile.typical_repayment_terms) &&
      lenderProfile.min_loan_amount > 0 &&
      lenderProfile.max_loan_amount >= lenderProfile.min_loan_amount,
  );
}

function formatLendingScope(lenderProfile: LenderProfile) {
  if (!lenderProfile) {
    return "Lending scope unavailable.";
  }

  return `${formatPhp(lenderProfile.min_loan_amount)} to ${formatPhp(
    lenderProfile.max_loan_amount,
  )} in ${lenderProfile.operating_area}`;
}

function getVerificationDescription(
  access: CurrentUserProfile,
  verification: LenderVerificationSummary | null,
) {
  const lenderProfile = access.lenderProfile;

  if (!lenderProfile) {
    return "Lender profile details are unavailable.";
  }

  if (lenderProfile.verification_status === "approved") {
    return "Approved for lending activity.";
  }

  if (lenderProfile.verification_status === "rejected") {
    return "Manager feedback requires updates.";
  }

  if (hasMissingRequiredLenderDocuments(verification)) {
    return "Required verification documents are missing.";
  }

  if (verification?.documentPolicy.readyForManagerReview) {
    return "Documents are waiting for manager review.";
  }

  return "Submitted for manager review.";
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function getLenderInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "LF";
}

function formatTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function formatProofStatus(status: string) {
  if (status === "submitted") {
    return "Waiting for review";
  }

  if (status === "verified") {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return status;
}

function formatRepaymentStatus(status: string) {
  if (status === "due") {
    return "Payment due";
  }

  if (status === "submitted") {
    return "Proof under review";
  }

  if (status === "verified") {
    return "Payment verified";
  }

  if (status === "rejected") {
    return "Needs corrected proof";
  }

  if (status === "late") {
    return "Payment overdue";
  }

  return status;
}

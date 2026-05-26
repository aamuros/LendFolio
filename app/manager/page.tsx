import Link from "next/link";
import type { ReactNode } from "react";
import { requireManager } from "@/lib/access-control";
import {
  loadManagerDashboardOverview,
  type ManagerDashboardKpi,
  type ManagerDashboardOverview,
  type ManagerLenderPerformanceRow,
  type ManagerMonthlyUserHeadcount,
  type ManagerUserStatusDistribution,
} from "@/lib/manager-dashboard";
import { BorrowerReadinessPanel } from "./borrower-readiness-panel";
import {
  AccessDenied,
  DataCard,
  ManagerShell,
  StatusMessage,
} from "./manager-ui";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-US");
const statusChartStyles = {
  active: {
    label: "Active",
    color: "var(--primary)",
  },
  pending: {
    label: "Pending",
    color: "#f3b43f",
  },
  suspended: {
    label: "Suspended",
    color: "#e85d75",
  },
} as const;
const statusOrder = ["active", "pending", "suspended"] as const;
const donutRadius = 42;
const donutCircumference = 2 * Math.PI * donutRadius;

export default async function ManagerPage() {
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Manager dashboard"
        description="Operational visibility for active loans, repayment proof, applications, offers, and audit events."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const dashboard = await loadManagerDashboardOverview(access.supabase);

  return (
    <ManagerShell
      title="Manager dashboard"
      description="Monitor portfolio activity, user readiness, application movement, and lender performance from one place."
      activeTab="home"
    >
      {!dashboard.ok ? (
        <StatusMessage message={dashboard.message} tone="error" />
      ) : null}

      <ManagerDashboardHome dashboard={dashboard.dashboard} />
    </ManagerShell>
  );
}

function ManagerDashboardHome({
  dashboard,
}: {
  dashboard: ManagerDashboardOverview;
}) {
  return (
    <section className="grid gap-5">
      <DashboardKpiGrid kpis={dashboard.kpis} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.85fr)]">
        <UserHeadcountChart monthlyHeadcount={dashboard.monthlyHeadcount} />
        <UserStatusDonut distribution={dashboard.statusDistribution} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <LenderPerformancePanel rows={dashboard.lenderPerformance} />
        <BorrowerReadinessPanel rows={dashboard.borrowerPerformance} />
      </section>
    </section>
  );
}

function DashboardKpiGrid({ kpis }: { kpis: ManagerDashboardKpi[] }) {
  return (
    <section
      aria-label="Manager dashboard key metrics"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {kpis.map((kpi) => (
        <DashboardKpiCard key={kpi.label} kpi={kpi} />
      ))}
    </section>
  );
}

function DashboardKpiCard({ kpi }: { kpi: ManagerDashboardKpi }) {
  return (
    <Link
      href={kpi.href}
      className="group grid min-h-40 gap-4 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className={`grid size-11 place-items-center rounded-2xl border shadow-sm ring-1 ring-white/70 ${getKpiAccentClass(
            kpi.accent,
          )}`}
        >
          <KpiIcon label={kpi.label} />
        </span>
      </div>
      <div className="grid gap-1">
        <p className="text-3xl leading-none font-semibold">
          {formatCount(kpi.value)}
        </p>
        <h2 className="text-sm font-semibold">{kpi.label}</h2>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          {kpi.description}
        </p>
      </div>
    </Link>
  );
}

function UserHeadcountChart({
  monthlyHeadcount,
}: {
  monthlyHeadcount: ManagerMonthlyUserHeadcount[];
}) {
  const hasUsers = monthlyHeadcount.some((month) => month.total > 0);
  const maxTotal = Math.max(
    1,
    ...monthlyHeadcount.map((month) => month.total),
  );

  return (
    <DataCard>
      <ChartCardHeader
        title="User headcount"
        description="Monthly registrations by profile status"
      />
      {hasUsers ? (
        <>
          <StatusLegend />
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-[760px] items-end gap-2 pt-2">
              {monthlyHeadcount.map((month) => (
                <div key={month.month} className="grid flex-1 gap-2 text-center">
                  <div
                    className="relative flex h-32 items-end justify-center border-b border-[var(--border)] px-1.5 pb-0"
                    aria-label={`${month.label}: ${month.active} active, ${month.pending} pending, ${month.suspended} suspended`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-1.5 top-0 border-t border-dashed border-[var(--border)]/70"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-1.5 top-1/2 border-t border-dashed border-[var(--border)]/70"
                    />
                    <div
                      className={`flex w-8 flex-col-reverse overflow-hidden rounded-t-lg border border-[var(--border)]/60 bg-[var(--muted)]/20 ${
                        month.total > 0 ? "" : "opacity-40"
                      }`}
                      style={{
                        height:
                          month.total > 0
                            ? `${Math.max((month.total / maxTotal) * 100, 8)}%`
                            : "6px",
                      }}
                    >
                      {month.total > 0
                        ? statusOrder.map((status) => (
                            <span
                              key={status}
                              className="block w-full"
                              style={{
                                height: `${(month[status] / month.total) * 100}%`,
                                backgroundColor: statusChartStyles[status].color,
                              }}
                              title={`${statusChartStyles[status].label}: ${month[status]}`}
                            />
                          ))
                        : null}
                    </div>
                  </div>
                  <div className="grid gap-0.5">
                    <p className="text-[11px] font-semibold text-[var(--foreground)]">
                      {month.label}
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {formatCount(month.total)} total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <DashboardEmptyState
          title="No users yet"
          description="Monthly headcount will appear after user profiles are created."
        />
      )}
    </DataCard>
  );
}

function UserStatusDonut({
  distribution,
}: {
  distribution: ManagerUserStatusDistribution[];
}) {
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const segments = getDonutSegments(distribution, total);

  return (
    <DataCard>
      <ChartCardHeader
        title="User status"
        description="Profile distribution across active, pending, and suspended users"
      />
      {total > 0 ? (
        <div className="grid gap-5">
          <div className="grid place-items-center">
            <svg
              role="img"
              aria-label={`User status distribution: ${distribution
                .map((item) => `${item.label} ${item.count}`)
                .join(", ")}`}
              viewBox="0 0 120 120"
              className="size-44"
            >
              <title>User status distribution</title>
              <circle
                cx="60"
                cy="60"
                r={donutRadius}
                fill="none"
                stroke="var(--muted)"
                strokeWidth="16"
              />
              {segments.map((segment) => (
                <circle
                  key={segment.status}
                  cx="60"
                  cy="60"
                  r={donutRadius}
                  fill="none"
                  stroke={segment.color}
                  strokeDasharray={`${segment.length} ${donutCircumference}`}
                  strokeDashoffset={-segment.offset}
                  strokeLinecap="round"
                  strokeWidth="16"
                  transform="rotate(-90 60 60)"
                />
              ))}
              <text
                x="60"
                y="57"
                textAnchor="middle"
                className="fill-[var(--foreground)] text-xl font-semibold"
              >
                {formatCount(total)}
              </text>
              <text
                x="60"
                y="74"
                textAnchor="middle"
                className="fill-[var(--muted-foreground)] text-[10px] font-semibold"
              >
                users
              </text>
            </svg>
          </div>

          <div className="grid gap-2">
            {distribution.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/25 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor: statusChartStyles[item.status].color,
                    }}
                  />
                  {item.label}
                </span>
                <span className="text-sm font-semibold">
                  {formatCount(item.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          title="No users yet"
          description="User status distribution will appear after profiles are created."
        />
      )}
    </DataCard>
  );
}

function LenderPerformancePanel({
  rows,
}: {
  rows: ManagerLenderPerformanceRow[];
}) {
  return (
    <DataCard>
      <PanelHeader
        title="Lender performance"
        description="Top lenders by completed applications"
        icon={<BriefcaseIcon />}
      />
      {rows.length > 0 ? (
        <ol className="grid gap-2">
          {rows.map((row, index) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--primary)]"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-[var(--muted)] text-xs font-semibold text-[var(--muted-foreground)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {row.displayName}
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {row.shortId}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-[#e8f6f3] px-3 py-2 text-right text-[#0f5f45]">
                    <p className="text-lg leading-none font-semibold">
                      {formatCount(row.completedApplicationCount)}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold">
                      completed
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MetricChip
                    value={row.acceptedOfferCount}
                    label="accepted offers"
                  />
                  <MetricChip value={row.activeLoanCount} label="active loans" />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <DashboardEmptyState
          title="No lender activity yet"
          description="Lender performance will appear after offers are accepted and loans are activated."
        />
      )}
    </DataCard>
  );
}

function ChartCardHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

function PanelHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#cbe8e4] bg-[#e8f6f3] text-[#0f5f45]"
      >
        {icon}
      </span>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[var(--muted-foreground)]">
      {statusOrder.map((status) => (
        <span key={status} className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ backgroundColor: statusChartStyles[status].color }}
          />
          {statusChartStyles[status].label}
        </span>
      ))}
    </div>
  );
}

function MetricChip({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]/25 px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)]">
      <span className="text-[var(--foreground)]">{formatCount(value)}</span>
      {label}
    </span>
  );
}

function DashboardEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

function getDonutSegments(
  distribution: ManagerUserStatusDistribution[],
  total: number,
) {
  let offset = 0;

  return distribution
    .filter((item) => item.count > 0)
    .map((item) => {
      const length = (item.count / total) * donutCircumference;
      const segment = {
        status: item.status,
        color: statusChartStyles[item.status].color,
        length,
        offset,
      };

      offset += length;
      return segment;
    });
}

function getKpiAccentClass(accent: ManagerDashboardKpi["accent"]) {
  const classes = {
    primary: "border-[#cbe8e4] bg-[#e8f6f3] text-[#0f5f45]",
    blue: "border-[#cfe7f8] bg-[#eaf6ff] text-[#075985]",
    amber: "border-[#f7dfac] bg-[#fff7df] text-[#806000]",
    rose: "border-[#f7cdd8] bg-[#fff0f4] text-[#9f1744]",
  };

  return classes[accent];
}

function KpiIcon({ label }: { label: string }) {
  const iconClass = "size-5";

  if (label === "Total Active Loans") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none">
        <path
          d="M7 4.75h7.25L18 8.5v10.75H7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M14.25 4.75V8.5H18M9.75 13.1l1.65 1.65 3.1-3.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (label === "Total Lenders") {
    return <BriefcaseIcon className={iconClass} />;
  }

  if (label === "Total Borrowers") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none">
        <path
          d="M9.25 11.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM4.75 19.25c.55-3.05 2.1-4.6 4.5-4.6s3.95 1.55 4.5 4.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.25 11.25a2.75 2.75 0 1 0 0-5.5M15.75 14.9c1.85.25 3 1.7 3.5 4.35"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none">
      <path
        d="M9 5.25h6M9.75 3.75h4.5l.75 2H9zM6.75 5.25h10.5v15H6.75z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 11h5.5M9.25 14.5h5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BriefcaseIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M8.25 7.75v-1.5a1.5 1.5 0 0 1 1.5-1.5h4.5a1.5 1.5 0 0 1 1.5 1.5v1.5M5.25 7.75h13.5v10.5H5.25z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 11.25h13.5M10 11.25v1.5h4v-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatCount(value: number) {
  return numberFormatter.format(value);
}

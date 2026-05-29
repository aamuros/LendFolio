import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireManager } from "@/lib/access-control";
import {
  loadManagerDashboardOverview,
  type ManagerDashboardKpi,
  type ManagerDashboardOverview,
  type ManagerMonthlyUserHeadcount,
  type ManagerUserStatusDistribution,
} from "@/lib/manager-dashboard";
import { BorrowerReadinessPanel } from "./borrower-readiness-panel";
import { LenderPerformancePanel } from "./lender-performance-panel";
import {
  AccessDenied,
  ManagerShell,
  StatusMessage,
} from "./manager-ui";
import {
  Wallet,
  Users,
  UserPlus,
  FileText,
} from "lucide-react";

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

const kpiIcons = {
  "Total Active Loans": Wallet,
  "Total Lenders": Users,
  "Total Borrowers": UserPlus,
  "Total Applications": FileText,
} as Record<string, React.ComponentType<{ className?: string }>>;

const kpiAccentClasses = {
  primary: "text-emerald-700 bg-emerald-50 border-emerald-200",
  blue: "text-blue-700 bg-blue-50 border-blue-200",
  amber: "text-amber-700 bg-amber-50 border-amber-200",
  rose: "text-rose-700 bg-rose-50 border-rose-200",
} as const;

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
    <div className="grid gap-6">
      <DashboardKpiGrid kpis={dashboard.kpis} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(17rem,0.85fr)]">
        <UserHeadcountChart monthlyHeadcount={dashboard.monthlyHeadcount} />
        <UserStatusDonut distribution={dashboard.statusDistribution} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LenderPerformancePanel rows={dashboard.lenderPerformance} />
        <BorrowerReadinessPanel rows={dashboard.borrowerPerformance} />
      </div>
    </div>
  );
}

function DashboardKpiGrid({ kpis }: { kpis: ManagerDashboardKpi[] }) {
  return (
    <section
      aria-label="Manager dashboard key metrics"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {kpis.map((kpi) => (
        <DashboardKpiCard key={kpi.label} kpi={kpi} />
      ))}
    </section>
  );
}

function DashboardKpiCard({ kpi }: { kpi: ManagerDashboardKpi }) {
  const IconComponent = kpiIcons[kpi.label] ?? FileText;

  return (
    <Link href={kpi.href} className="group block">
      <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs font-medium">
              {kpi.label}
            </CardDescription>
            <div
              className={`flex size-9 items-center justify-center rounded-lg border ${kpiAccentClasses[kpi.accent]}`}
            >
              <IconComponent className="size-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">
            {formatCount(kpi.value)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {kpi.description}
          </p>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>User headcount</CardTitle>
        <CardDescription>Monthly registrations by profile status</CardDescription>
      </CardHeader>
      <CardContent>
        {hasUsers ? (
          <>
            <StatusLegend />
            <div className="mt-4 overflow-x-auto pb-1">
              <div className="flex min-w-[760px] items-end gap-2 pt-2">
                {monthlyHeadcount.map((month) => (
                  <div key={month.month} className="grid flex-1 gap-2 text-center">
                    <div
                      className="relative flex h-32 items-end justify-center border-b px-1.5 pb-0"
                      aria-label={`${month.label}: ${month.active} active, ${month.pending} pending, ${month.suspended} suspended`}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-1.5 top-0 border-t border-dashed border-border/70"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-1.5 top-1/2 border-t border-dashed border-border/70"
                      />
                      <div
                        className={`flex w-8 flex-col-reverse overflow-hidden rounded-t-lg border border-border/60 bg-muted/20 ${
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
                      <p className="text-[11px] font-semibold">
                        {month.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
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
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>User status</CardTitle>
        <CardDescription>
          Profile distribution across active, pending, and suspended users
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  className="fill-foreground text-xl font-semibold"
                >
                  {formatCount(total)}
                </text>
                <text
                  x="60"
                  y="74"
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] font-semibold"
                >
                  users
                </text>
              </svg>
            </div>

            <div className="grid gap-2">
              {distribution.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/25 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: statusChartStyles[item.status].color,
                      }}
                    />
                    {item.label}
                  </span>
                  <span className="text-sm font-medium">
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
      </CardContent>
    </Card>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
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

function DashboardEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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

function formatCount(value: number) {
  return numberFormatter.format(value);
}

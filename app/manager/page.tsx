import Link from "next/link";
import {
  Card,
  CardAction,
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
import {
  UserHeadcountBarChart,
  UserStatusPieChart,
  statusChartColors,
} from "./dashboard-charts";
import { LenderPerformancePanel } from "./lender-performance-panel";
import { AccessDenied, ManagerShell, StatusMessage } from "./manager-ui";
import { Wallet, Users, UserPlus, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-US");

const kpiIcons = {
  "Total Active Loans": Wallet,
  "Total Lenders": Users,
  "Total Borrowers": UserPlus,
  "Total Applications": FileText,
} as Record<string, React.ComponentType<{ className?: string }>>;

export default async function ManagerPage() {
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Manager dashboard"
        description="Operational visibility for active loans, repayment proof, applications, offers, and audit events."
        showHeading={false}
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const dashboard = await loadManagerDashboardOverview(access.supabase);

  return (
    <ManagerShell
      title="Manager dashboard"
      description="Monitor portfolio activity, user readiness, application movement, and lender performance."
      showHeading={false}
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
    <div className="grid gap-4 md:gap-6">
      <DashboardKpiGrid kpis={dashboard.kpis} />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
        <UserHeadcountChart monthlyHeadcount={dashboard.monthlyHeadcount} />
        <UserStatusDonut distribution={dashboard.statusDistribution} />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <LenderPerformancePanel rows={dashboard.lenderPerformance} />
        <BorrowerReadinessPanel rows={dashboard.borrowerPerformance} />
      </div>
    </div>
  );
}

function DashboardKpiGrid({ kpis }: { kpis: ManagerDashboardKpi[] }) {
  return (
    <section
      aria-label="Key metrics"
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
      <Card className="shadow-xs transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardDescription className="text-xs font-medium">
            {kpi.label}
          </CardDescription>
          <CardAction>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <IconComponent className="size-4" />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>User headcount</CardTitle>
        <CardDescription>
          Monthly registrations by profile status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasUsers ? (
          <UserHeadcountBarChart data={monthlyHeadcount} />
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>User status</CardTitle>
        <CardDescription>
          Profile distribution by status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="grid gap-4">
            <UserStatusPieChart data={distribution} total={total} />
            <div className="grid gap-1">
              {distribution.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          statusChartColors[item.status] ?? "var(--muted)",
                      }}
                    />
                    {item.label}
                  </span>
                  <span className="tabular-nums font-medium">
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

function DashboardEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function formatCount(value: number) {
  return numberFormatter.format(value);
}

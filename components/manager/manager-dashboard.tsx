import Link from "next/link";
import type { ManagerDashboardOverview } from "@/lib/manager-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformSnapshot } from "./platform-snapshot";
import { ActivityChart } from "./activity-chart";
import { RevenueChart } from "./revenue-chart";
import { TodaysActions } from "./todays-actions";

const numberFormatter = new Intl.NumberFormat("en-US");

export function ManagerDashboard({
  dashboard,
}: {
  dashboard: ManagerDashboardOverview;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <section
        aria-label="Operational summary"
        className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3"
      >
        {dashboard.kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/70 bg-card/95 shadow-xs">
            <CardContent className="p-4">
              <Link
                href={kpi.href}
                className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {numberFormatter.format(kpi.value)}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {kpi.description}
                </p>
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
        <TodaysActions pendingActions={dashboard.pendingActions} />
        <PlatformSnapshot
          kpis={dashboard.kpis}
          monthlyActivity={dashboard.monthlyActivity}
          revenue={dashboard.revenue}
        />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <RevenueChart data={dashboard.monthlyRevenue} />
        <ActivityChart data={dashboard.monthlyActivity} />
      </div>
    </div>
  );
}

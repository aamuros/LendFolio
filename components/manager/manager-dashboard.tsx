import type { ManagerDashboardOverview } from "@/lib/manager-dashboard";
import { PlatformSnapshot } from "./platform-snapshot";
import { ActivityChart } from "./activity-chart";
import { TodaysActions } from "./todays-actions";

export function ManagerDashboard({
  dashboard,
}: {
  dashboard: ManagerDashboardOverview;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TodaysActions pendingActions={dashboard.pendingActions} />
        <PlatformSnapshot
          kpis={dashboard.kpis}
          monthlyActivity={dashboard.monthlyActivity}
          revenue={dashboard.revenue}
        />
      </div>
      <ActivityChart data={dashboard.monthlyActivity} />
    </div>
  );
}

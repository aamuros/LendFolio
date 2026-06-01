import { getManagerAccess } from "./manager-access";
import { loadManagerDashboardOverview } from "@/lib/manager-dashboard";
import { ManagerDashboard } from "@/components/manager/manager-dashboard";
import { AccessDenied, ManagerShell, StatusMessage } from "./manager-ui";
import { withServerTiming } from "@/lib/perf";



export default async function ManagerPage() {
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
    <ManagerShell title="Manager dashboard" description="">
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const { result: dashboard } = await withServerTiming(
    "loadManagerDashboardOverview",
    () => loadManagerDashboardOverview(access.supabase),
  );

  return (
    <ManagerShell title="Manager dashboard" description="Review platform activity, pending approvals, and lending operations.">
      {!dashboard.ok ? (
        <StatusMessage message={dashboard.message} tone="error" />
      ) : null}

      <ManagerDashboard dashboard={dashboard.dashboard} />
    </ManagerShell>
  );
}

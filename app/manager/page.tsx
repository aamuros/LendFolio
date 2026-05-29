import { getManagerAccess } from "./manager-access";
import { loadManagerDashboardOverview } from "@/lib/manager-dashboard";
import { ManagerDashboard } from "@/components/manager/manager-dashboard";
import { AccessDenied, ManagerShell, StatusMessage } from "./manager-ui";
import { withServerTiming } from "@/lib/perf";



export default async function ManagerPage() {
  const access = await getManagerAccess();

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

  const { result: dashboard } = await withServerTiming(
    "loadManagerDashboardOverview",
    () => loadManagerDashboardOverview(access.supabase),
  );

  return (
    <ManagerShell
      title="Manager dashboard"
      description="Operations console for platform activity, pending actions, and performance."
    >
      {!dashboard.ok ? (
        <StatusMessage message={dashboard.message} tone="error" />
      ) : null}

      <ManagerDashboard dashboard={dashboard.dashboard} />
    </ManagerShell>
  );
}

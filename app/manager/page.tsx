import { AuthStatus } from "@/components/auth-status";
import { DemoDashboardShell } from "@/components/demo-dashboard-shell";
import { getDemoRole } from "@/lib/demo-roles";

export const dynamic = "force-dynamic";

export default function ManagerPage() {
  const config = getDemoRole("manager");

  if (!config) {
    return null;
  }

  // TODO(Sprint 2+): Replace this placeholder shell with monitoring and audit log views.
  return (
    <DemoDashboardShell config={config}>
      <AuthStatus role="manager" />
    </DemoDashboardShell>
  );
}

import type { ReactNode } from "react";
import { signOutAction } from "@/app/login/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getManagerAccess } from "./manager-access";

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  let userEmail: string | null = null;

  try {
    const access = await getManagerAccess();
    if (access.ok) {
      // Profile is available from the cached requireManager() result.
      // The user email isn't stored in the profile row, but the Supabase
      // client is available to fetch it without an additional auth call.
      const {
        data: { user },
      } = await access.supabase.auth.getUser();
      userEmail = user?.email ?? null;
    }
  } catch {
    // Auth not available
  }

  return (
    <DashboardShell
      role="manager"
      brandLabel="Manager Console"
      roleLabel="Manager"
      dashboardHref="/manager"
      userEmail={userEmail}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}

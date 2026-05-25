import Link from "next/link";
import { requireManager } from "@/lib/access-control";
import { loadManagerOverview } from "@/lib/manager-operations";
import {
  AccessDenied,
  DataCard,
  ManagerShell,
  StatusMessage,
  managerNavItems,
} from "./manager-ui";

export const dynamic = "force-dynamic";

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

  const overview = await loadManagerOverview(access.supabase);

  return (
    <ManagerShell
      title="Manager dashboard"
      description="Monitor portfolio activity, repayment evidence, application movement, and workflow events from one place."
    >
      {!overview.ok ? (
        <StatusMessage message={overview.message} tone="error" />
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {overview.metrics.map((metric) => (
          <Link key={metric.label} href={metric.href}>
            <DataCard>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                {metric.label}
              </p>
              <p className="text-3xl font-semibold">{metric.value}</p>
            </DataCard>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {managerNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <DataCard>
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                    {item.description}
                  </p>
                </div>
                <span className="text-lg font-semibold">-&gt;</span>
              </div>
            </DataCard>
          </Link>
        ))}
      </section>
    </ManagerShell>
  );
}

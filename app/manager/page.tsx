import Link from "next/link";
import { refreshOverdueStatusesAction } from "@/app/manager/actions";
import { requireManager } from "@/lib/access-control";
import {
  loadManagerOverview,
  type ManagerOverviewMetric,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  DataCard,
  ManagerShell,
  StatusMessage,
  managerNavItems,
} from "./manager-ui";

export const dynamic = "force-dynamic";

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ overdueRefresh?: string }>;
}) {
  const params = await searchParams;
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
      activeTab="home"
    >
      {!overview.ok ? (
        <StatusMessage message={overview.message} tone="error" />
      ) : null}
      {params.overdueRefresh === "success" ? (
        <StatusMessage message="Overdue statuses refreshed." />
      ) : null}
      {params.overdueRefresh === "error" ? (
        <StatusMessage message="Could not refresh overdue statuses." tone="error" />
      ) : null}

      <HomeOverview metrics={overview.metrics} />

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)]">
          Operations
        </h2>
        {managerNavItems
          .filter((item) =>
            ["/manager/applications", "/manager/audit-logs", "/manager/lookup"].includes(
              item.href,
            ) || item.href === "/manager/lenders",
          )
          .map((item) => (
          <Link key={item.href} href={item.href}>
            <DataCard>
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                    {item.description}
                  </p>
                </div>
                <span aria-hidden="true" className="text-lg font-semibold">
                  -&gt;
                </span>
              </div>
            </DataCard>
          </Link>
        ))}
      </section>
    </ManagerShell>
  );
}

function HomeOverview({ metrics }: { metrics: ManagerOverviewMetric[] }) {
  const metric = (label: string) =>
    metrics.find((item) => item.label === label) ?? {
      label,
      value: 0,
      href: "/manager",
    };
  const submittedProofs = metric("Submitted proofs");
  const rejectedProofs = metric("Rejected proofs");
  const openApplications = metric("Open/submitted applications");
  const activeLoans = metric("Active loans");
  const overdueLoans = metric("Overdue loans");
  const lateRepayments = metric("Late repayments");
  const pendingOffers = metric("Pending offers");
  const nextAction =
    submittedProofs.value > 0
      ? {
          title: `${submittedProofs.value} repayment proof ${
            submittedProofs.value === 1 ? "needs" : "need"
          } review`,
          description: "Open submitted evidence and confirm lender review progress.",
          href: submittedProofs.href,
          label: "Review proofs",
        }
      : rejectedProofs.value > 0
        ? {
            title: `${rejectedProofs.value} rejected ${
              rejectedProofs.value === 1 ? "proof" : "proofs"
            } to monitor`,
            description: "Check rejected proof activity and borrower follow-through.",
            href: rejectedProofs.href,
            label: "View rejected proofs",
          }
        : openApplications.value > 0
          ? {
              title: `${openApplications.value} ${
                openApplications.value === 1 ? "application is" : "applications are"
              } open`,
              description: "Track submitted borrower requests and offer movement.",
              href: openApplications.href,
              label: "View applications",
            }
          : activeLoans.value > 0
            ? {
                title: `${activeLoans.value} active ${
                  activeLoans.value === 1 ? "loan" : "loans"
                }`,
                description: "Review funded loans and upcoming repayment dates.",
                href: activeLoans.href,
                label: "View loans",
              }
            : pendingOffers.value > 0
              ? {
                  title: `${pendingOffers.value} pending ${
                    pendingOffers.value === 1 ? "offer" : "offers"
                  }`,
                  description: "Monitor offers waiting on borrower response.",
                  href: pendingOffers.href,
                  label: "View offers",
                }
              : {
                  title: "Operations are clear",
                  description: "New borrower and repayment activity will appear here.",
                  href: "/manager/lookup",
                  label: "Search records",
                };

  return (
    <section className="grid gap-4">
      <div className="rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
        <div className="grid gap-3">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Today
          </p>
          <h2 className="text-3xl leading-tight font-semibold">
            {nextAction.title}
          </h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {nextAction.description}
          </p>
          <Link
            href={nextAction.href}
            className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold !text-white transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            {nextAction.label}
          </Link>
          <form action={refreshOverdueStatusesAction}>
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
            >
              Refresh overdue statuses
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard metric={lateRepayments} label="Late" />
        <SummaryCard metric={overdueLoans} label="Overdue" />
        <SummaryCard metric={activeLoans} label="Active" />
      </div>

      <div className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm">
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
          Portfolio snapshot
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3 transition hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            >
              <p className="text-2xl font-semibold">{item.value}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                {item.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  metric,
  label,
}: {
  metric: ManagerOverviewMetric;
  label: string;
}) {
  return (
    <Link
      href={metric.href}
      className="rounded-2xl border border-[var(--border)] bg-white px-3 py-4 text-center shadow-sm transition hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
    >
      <p className="text-2xl font-semibold">{metric.value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </p>
    </Link>
  );
}

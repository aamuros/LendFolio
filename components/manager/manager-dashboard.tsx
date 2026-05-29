import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ManagerDashboardKpi,
  ManagerDashboardOverview,
} from "@/lib/manager-dashboard";
import { BorrowerReadinessPanel } from "@/app/manager/borrower-readiness-panel";
import { LenderPerformancePanel } from "@/app/manager/lender-performance-panel";
import { ManagerMetricCards } from "./manager-metric-cards";
import {
  ManagerOperationsTable,
  type OperationsQueueItem,
} from "./manager-operations-table";
import { Wallet, Users, UserPlus, FileText } from "lucide-react";

const numberFormatter = new Intl.NumberFormat("en-US");

const kpiIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Total Active Loans": Wallet,
  "Total Lenders": Users,
  "Total Borrowers": UserPlus,
  "Total Applications": FileText,
};

function buildOperationsQueue(
  dashboard: ManagerDashboardOverview,
): OperationsQueueItem[] {
  const items: OperationsQueueItem[] = [];

  if (dashboard.pendingActions.pendingBorrowerVerifications > 0) {
    items.push({
      id: "queue-verifications",
      type: "borrower_verification",
      subject: `${dashboard.pendingActions.pendingBorrowerVerifications} verification${dashboard.pendingActions.pendingBorrowerVerifications !== 1 ? "s" : ""} awaiting review`,
      status: "Submitted",
      priority: "high",
      updatedAt: "Now",
      href: "/manager/borrower-verifications?status=submitted",
    });
  }

  if (dashboard.pendingActions.pendingLenderReviews > 0) {
    items.push({
      id: "queue-lender-reviews",
      type: "lender_review",
      subject: `${dashboard.pendingActions.pendingLenderReviews} lender signup${dashboard.pendingActions.pendingLenderReviews !== 1 ? "s" : ""} to review`,
      status: "Pending",
      priority: "high",
      updatedAt: "Now",
      href: "/manager/lenders?status=pending",
    });
  }

  if (dashboard.pendingActions.openApplications > 0) {
    items.push({
      id: "queue-applications",
      type: "loan_application",
      subject: `${dashboard.pendingActions.openApplications} open application${dashboard.pendingActions.openApplications !== 1 ? "s" : ""} awaiting offers`,
      status: "Open",
      priority: "medium",
      updatedAt: "Now",
      href: "/manager/applications?status=open",
    });
  }

  if (dashboard.pendingActions.pendingRepaymentReviews > 0) {
    items.push({
      id: "queue-repayment-proofs",
      type: "repayment_proof",
      subject: `${dashboard.pendingActions.pendingRepaymentReviews} repayment proof${dashboard.pendingActions.pendingRepaymentReviews !== 1 ? "s" : ""} to verify`,
      status: "Submitted",
      priority: "medium",
      updatedAt: "Now",
      href: "/manager/repayments?proofStatus=submitted",
    });
  }

  return items;
}

export function ManagerDashboard({
  dashboard,
}: {
  dashboard: ManagerDashboardOverview;
}) {
  const queueItems = buildOperationsQueue(dashboard);

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <ManagerMetricCards pendingActions={dashboard.pendingActions} />

      <ManagerOperationsTable items={queueItems} />

      <DashboardKpiOverview kpis={dashboard.kpis} />

      <section aria-label="Performance signals" className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <LenderPerformancePanel rows={dashboard.lenderPerformance} />
        <BorrowerReadinessPanel rows={dashboard.borrowerPerformance} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>
            Platform activity charts will appear once real activity metrics are
            wired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
            <p className="text-sm font-medium">Coming soon</p>
            <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">
              Application trends, approval rates, and repayment activity will
              appear here once platform analytics are connected.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardKpiOverview({ kpis }: { kpis: ManagerDashboardKpi[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio overview</CardTitle>
        <CardDescription>
          High-level platform metrics across all statuses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const IconComponent = kpiIcons[kpi.label] ?? FileText;
            return (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="group flex items-start gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <IconComponent className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="text-xl font-semibold tracking-tight tabular-nums">
                    {numberFormatter.format(kpi.value)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {kpi.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

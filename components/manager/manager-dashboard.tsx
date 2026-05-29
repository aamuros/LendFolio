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
import { ManagerActivityChart } from "./manager-activity-chart";
import {
  ManagerOperationsTable,
  type OperationsQueueItem,
} from "./manager-operations-table";
import {
  Wallet,
  Users,
  UserPlus,
  FileText,
  ArrowUpRightIcon,
  ShieldCheck,
  UserCheck,
  Receipt,
  ClipboardList,
  BarChart3,
} from "lucide-react";

const numberFormatter = new Intl.NumberFormat("en-US");

const kpiIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Total Active Loans": Wallet,
  "Total Lenders": Users,
  "Total Borrowers": UserPlus,
  "Total Applications": FileText,
};

const placeholderQueueItems: OperationsQueueItem[] = [
  {
    id: "placeholder-1",
    type: "borrower_verification",
    subject: "Pending verification submission",
    status: "Submitted",
    priority: "high",
    updatedAt: "Today",
    href: "/manager/borrower-verifications?status=submitted",
  },
  {
    id: "placeholder-2",
    type: "lender_review",
    subject: "New lender signup request",
    status: "Pending",
    priority: "high",
    updatedAt: "Today",
    href: "/manager/lenders?status=pending",
  },
  {
    id: "placeholder-3",
    type: "loan_application",
    subject: "Application awaiting offers",
    status: "Open",
    priority: "medium",
    updatedAt: "Yesterday",
    href: "/manager/applications?status=open",
  },
  {
    id: "placeholder-4",
    type: "repayment_proof",
    subject: "Proof submitted for review",
    status: "Submitted",
    priority: "medium",
    updatedAt: "Yesterday",
    href: "/manager/repayments?proofStatus=submitted",
  },
  {
    id: "placeholder-5",
    type: "audit_event",
    subject: "Offer accepted workflow event",
    status: "Logged",
    priority: "low",
    updatedAt: "2 days ago",
    href: "/manager/audit-logs",
  },
];

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
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <ManagerMetricCards pendingActions={dashboard.pendingActions} />

        <div className="px-4 lg:px-6">
          <ManagerActivityChart />
        </div>

        <div className="px-4 lg:px-6">
          <ManagerOperationsTable
            items={queueItems.length > 0 ? queueItems : placeholderQueueItems}
          />
        </div>

        <div className="px-4 lg:px-6">
          <DashboardKpiOverview kpis={dashboard.kpis} />
        </div>

        <div className="grid gap-4 px-4 md:gap-6 lg:grid-cols-2 lg:px-6">
          <LenderPerformancePanel rows={dashboard.lenderPerformance} />
          <BorrowerReadinessPanel rows={dashboard.borrowerPerformance} />
        </div>

        <div className="px-4 lg:px-6">
          <SecondaryNavigation />
        </div>
      </div>
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

const secondaryNavItems = [
  {
    title: "Lender approvals",
    description: "Review and approve lender signup requests.",
    href: "/manager/lenders",
    icon: UserCheck,
  },
  {
    title: "Borrower verification",
    description: "Review submitted verification documents.",
    href: "/manager/borrower-verifications",
    icon: ShieldCheck,
  },
  {
    title: "Application monitoring",
    description: "Track application and offer lifecycles.",
    href: "/manager/applications",
    icon: FileText,
  },
  {
    title: "Repayment monitoring",
    description: "Monitor proof submissions and review outcomes.",
    href: "/manager/repayments",
    icon: Receipt,
  },
  {
    title: "Audit logs",
    description: "Review workflow events across the platform.",
    href: "/manager/audit-logs",
    icon: ClipboardList,
  },
  {
    title: "User lookup",
    description: "Search users, records, and loans.",
    href: "/manager/lookup",
    icon: Users,
  },
  {
    title: "Analytics",
    description: "View lender and borrower performance.",
    href: "/manager#analytics",
    icon: BarChart3,
  },
];

function SecondaryNavigation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager sections</CardTitle>
        <CardDescription>
          Quick access to all operations console areas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {secondaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <item.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  <ArrowUpRightIcon className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

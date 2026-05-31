import type { ManagerDashboardOverview } from "@/lib/manager-dashboard";
import { BorrowerReadinessPanel } from "@/app/manager/borrower-readiness-panel";
import { LenderPerformancePanel } from "@/app/manager/lender-performance-panel";
import { ManagerMetricCards } from "./manager-metric-cards";
import {
  ManagerOperationsTable,
  type OperationsQueueItem,
} from "./manager-operations-table";

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

      <section aria-label="Performance signals" className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <LenderPerformancePanel rows={dashboard.lenderPerformance} />
        <BorrowerReadinessPanel rows={dashboard.borrowerPerformance} />
      </section>
    </div>
  );
}

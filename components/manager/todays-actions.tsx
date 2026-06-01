import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ManagerPendingActionCounts } from "@/lib/manager-dashboard";
import {
  ShieldCheck,
  UserCheck,
  FileText,
  Receipt,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

type ActionItem = {
  label: string;
  description: string;
  count: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

function buildActionItems(
  pendingActions: ManagerPendingActionCounts,
): ActionItem[] {
  const items: ActionItem[] = [];

  if (pendingActions.pendingBorrowerVerifications > 0) {
    items.push({
      label: "Borrower verifications",
      description: "Documents awaiting your review",
      count: pendingActions.pendingBorrowerVerifications,
      href: "/manager/borrower-verifications?status=submitted",
      icon: ShieldCheck,
    });
  }

  if (pendingActions.pendingLenderReviews > 0) {
    items.push({
      label: "Lender reviews",
      description: "Signup requests to approve",
      count: pendingActions.pendingLenderReviews,
      href: "/manager/lenders?status=pending",
      icon: UserCheck,
    });
  }

  if (pendingActions.pendingRepaymentReviews > 0) {
    items.push({
      label: "Repayment proofs",
      description: "Proofs awaiting verification",
      count: pendingActions.pendingRepaymentReviews,
      href: "/manager/repayments?proofStatus=submitted",
      icon: Receipt,
    });
  }

  if (pendingActions.openApplications > 0) {
    items.push({
      label: "Open applications",
      description: "Submitted or open for offers",
      count: pendingActions.openApplications,
      href: "/manager/applications?status=open",
      icon: FileText,
    });
  }

  return items;
}

export function TodaysActions({
  pendingActions,
}: {
  pendingActions: ManagerPendingActionCounts;
}) {
  const items = buildActionItems(pendingActions);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Pending actions</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>No pending items</span>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 -mx-1 px-1 rounded-md transition-colors hover:bg-muted/50"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="hidden sm:block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                  <Badge variant="destructive" className="tabular-nums">
                    {item.count}
                  </Badge>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

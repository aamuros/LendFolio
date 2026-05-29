import Link from "next/link";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ManagerPendingActionCounts } from "@/lib/manager-dashboard";
import {
  ShieldCheck,
  UserCheck,
  FileText,
  Receipt,
} from "lucide-react";

const numberFormatter = new Intl.NumberFormat("en-US");

type MetricCardConfig = {
  label: string;
  description: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeTone: "default" | "secondary" | "destructive";
};

function buildMetricCards(
  pendingActions: ManagerPendingActionCounts,
): MetricCardConfig[] {
  return [
    {
      label: "Borrower verifications",
      description: "Awaiting your review",
      value: pendingActions.pendingBorrowerVerifications,
      href: "/manager/borrower-verifications?status=submitted",
      icon: ShieldCheck,
      badgeTone:
        pendingActions.pendingBorrowerVerifications > 0
          ? "destructive"
          : "secondary",
    },
    {
      label: "Lender reviews",
      description: "Signup requests to approve",
      value: pendingActions.pendingLenderReviews,
      href: "/manager/lenders?status=pending",
      icon: UserCheck,
      badgeTone:
        pendingActions.pendingLenderReviews > 0 ? "destructive" : "secondary",
    },
    {
      label: "Loan applications",
      description: "Open or submitted for offers",
      value: pendingActions.openApplications,
      href: "/manager/applications?status=submitted",
      icon: FileText,
      badgeTone:
        pendingActions.openApplications > 0 ? "default" : "secondary",
    },
    {
      label: "Repayment proofs",
      description: "Proofs awaiting verification",
      value: pendingActions.pendingRepaymentReviews,
      href: "/manager/repayments?proofStatus=submitted",
      icon: Receipt,
      badgeTone:
        pendingActions.pendingRepaymentReviews > 0
          ? "destructive"
          : "secondary",
    },
  ];
}

export function ManagerMetricCards({
  pendingActions,
}: {
  pendingActions: ManagerPendingActionCounts;
}) {
  const cards = buildMetricCards(pendingActions);

  return (
    <section
      aria-label="Pending actions"
      className="*:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Card className="transition-colors group-hover:bg-muted/50 group-focus-visible:ring-0">
            <CardHeader>
              <CardDescription className="text-xs font-medium">
                {card.label}
              </CardDescription>
              <CardAction>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <card.icon className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {numberFormatter.format(card.value)}
                </p>
                {card.value > 0 ? (
                  <Badge variant={card.badgeTone} className="text-[10px]">
                    Action needed
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Clear
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}

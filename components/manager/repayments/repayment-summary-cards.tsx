import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ReceiptTextIcon,
  CircleCheckIcon,
  CircleXIcon,
  CalendarClockIcon,
} from "lucide-react";
import type { ManagerRepaymentProofRow } from "@/lib/manager-operations";

const numberFormatter = new Intl.NumberFormat("en-US");

type SummaryCardConfig = {
  label: string;
  description: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  badgeTone: "default" | "secondary" | "destructive";
  showAttentionBadge: boolean;
};

function buildSummaryCards(
  proofs: ManagerRepaymentProofRow[],
): SummaryCardConfig[] {
  const pendingReview = proofs.filter(
    (p) => p.proofStatus === "submitted",
  ).length;
  const verifiedProofs = proofs.filter(
    (p) => p.proofStatus === "verified",
  ).length;
  const rejectedProofs = proofs.filter(
    (p) => p.proofStatus === "rejected",
  ).length;
  const overdueRepayments = proofs.filter(
    (p) => p.repaymentStatus === "late",
  ).length;

  return [
    {
      label: "Pending review",
      description: "Submitted proofs waiting for review.",
      value: pendingReview,
      icon: ReceiptTextIcon,
      badgeTone: "secondary",
      showAttentionBadge: true,
    },
    {
      label: "Verified proofs",
      description: "Payment evidence approved by lenders.",
      value: verifiedProofs,
      icon: CircleCheckIcon,
      badgeTone: "default",
      showAttentionBadge: false,
    },
    {
      label: "Rejected proofs",
      description: "Proofs that require borrower correction.",
      value: rejectedProofs,
      icon: CircleXIcon,
      badgeTone: "destructive",
      showAttentionBadge: true,
    },
    {
      label: "Overdue repayments",
      description: "Repayments past their due date.",
      value: overdueRepayments,
      icon: CalendarClockIcon,
      badgeTone: "destructive",
      showAttentionBadge: true,
    },
  ];
}

export function RepaymentSummaryCards({
  proofs,
}: {
  proofs: ManagerRepaymentProofRow[];
}) {
  const cards = buildSummaryCards(proofs);

  return (
    <section
      aria-label="Repayment summary"
      className="*:data-[slot=card]:shadow-xs grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
    >
      {cards.map((card) => (
        <Card key={card.label}>
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
              {card.showAttentionBadge && card.value > 0 ? (
                <Badge variant={card.badgeTone} className="text-[10px]">
                  Needs attention
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground text-pretty">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

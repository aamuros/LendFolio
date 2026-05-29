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

const numberFormatter = new Intl.NumberFormat("en-US");

type SummaryCardConfig = {
  label: string;
  description: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  badgeTone: "default" | "secondary" | "destructive";
};

const managerRepaymentSummaryMockData: SummaryCardConfig[] = [
  {
    label: "Pending review",
    description: "Submitted proofs waiting for review.",
    value: 0,
    icon: ReceiptTextIcon,
    badgeTone: "secondary",
  },
  {
    label: "Verified proofs",
    description: "Payment evidence approved by lenders.",
    value: 0,
    icon: CircleCheckIcon,
    badgeTone: "default",
  },
  {
    label: "Rejected proofs",
    description: "Proofs that require borrower correction.",
    value: 0,
    icon: CircleXIcon,
    badgeTone: "destructive",
  },
  {
    label: "Overdue repayments",
    description: "Repayments past their due date.",
    value: 0,
    icon: CalendarClockIcon,
    badgeTone: "destructive",
  },
];

export function RepaymentSummaryCards() {
  const cards = managerRepaymentSummaryMockData;

  return (
    <section
      aria-label="Repayment summary"
      className="*:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
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
              {card.value > 0 ? (
                <Badge variant={card.badgeTone} className="text-[10px]">
                  Needs attention
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

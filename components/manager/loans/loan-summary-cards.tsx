import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Wallet,
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
} from "lucide-react";
import type { ManagerLoanRow } from "@/lib/manager-operations";

const numberFormatter = new Intl.NumberFormat("en-US");

const managerLoanSummaryMockData = {
  activeLoans: 0,
  overdueLoans: 0,
  dueIn7Days: 0,
  outstandingBalance: 0,
  platformRevenue: 0,
};

type SummaryCardConfig = {
  label: string;
  description: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  format: "number" | "currency";
};

function buildSummaryCards(loans: ManagerLoanRow[]): SummaryCardConfig[] {
  if (loans.length === 0) {
    return [
      {
        label: "Active loans",
        description: "Funded loans currently being monitored.",
        value: managerLoanSummaryMockData.activeLoans,
        icon: Wallet,
        format: "number",
      },
      {
        label: "Overdue loans",
        description: "Loans with repayments past their due date.",
        value: managerLoanSummaryMockData.overdueLoans,
        icon: AlertTriangle,
        format: "number",
      },
      {
        label: "Outstanding balance",
        description: "Total unpaid balance across monitored loans.",
        value: managerLoanSummaryMockData.outstandingBalance,
        icon: CircleDollarSign,
        format: "currency",
      },
      {
        label: "Platform revenue",
        description: "Processing fee revenue from funded loans.",
        value: managerLoanSummaryMockData.platformRevenue,
        icon: CalendarClock,
        format: "currency",
      },
    ];
  }

  const activeLoans = loans.filter(
    (loan) => loan.status === "active" || loan.status === "overdue",
  ).length;

  const overdueLoans = loans.filter(
    (loan) => loan.status === "overdue",
  ).length;

  const outstandingBalance = loans
    .filter((loan) => loan.status === "active" || loan.status === "overdue")
    .reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const platformRevenue = loans.reduce(
    (sum, loan) => sum + loan.processingFee,
    0,
  );

  return [
    {
      label: "Active loans",
      description: "Funded loans currently being monitored.",
      value: activeLoans,
      icon: Wallet,
      format: "number",
    },
    {
      label: "Overdue loans",
      description: "Loans with repayments past their due date.",
      value: overdueLoans,
      icon: AlertTriangle,
      format: "number",
    },
    {
      label: "Outstanding balance",
      description: "Total unpaid balance across active loans.",
      value: outstandingBalance,
      icon: CircleDollarSign,
      format: "currency",
    },
    {
      label: "Platform revenue",
      description: "Processing fee revenue from funded loans.",
      value: platformRevenue,
      icon: CalendarClock,
      format: "currency",
    },
  ];
}

function formatValue(value: number, format: "number" | "currency") {
  if (format === "currency") {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return numberFormatter.format(value);
}

export function LoanSummaryCards({
  loans,
}: {
  loans: ManagerLoanRow[];
}) {
  const cards = buildSummaryCards(loans);

  return (
    <section
      aria-label="Loan summary"
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
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatValue(card.value, card.format)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

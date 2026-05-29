import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  FileText,
  ClipboardCheck,
  Send,
  CheckCircle2,
} from "lucide-react";
import type { ManagerApplicationRow } from "@/lib/manager-operations";

const numberFormatter = new Intl.NumberFormat("en-US");

const managerApplicationSummaryMockData = {
  openApplications: 0,
  needsReview: 0,
  offersSent: 0,
  acceptedOffers: 0,
};

type SummaryCardConfig = {
  label: string;
  description: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
};

function buildSummaryCards(
  applications: ManagerApplicationRow[],
): SummaryCardConfig[] {
  if (applications.length === 0) {
    return [
      {
        label: "Open applications",
        description: "Applications currently available for review.",
        value: managerApplicationSummaryMockData.openApplications,
        icon: FileText,
      },
      {
        label: "Needs review",
        description: "Applications waiting for manager attention.",
        value: managerApplicationSummaryMockData.needsReview,
        icon: ClipboardCheck,
      },
      {
        label: "Offers sent",
        description: "Total lender offers linked to applications.",
        value: managerApplicationSummaryMockData.offersSent,
        icon: Send,
      },
      {
        label: "Accepted offers",
        description: "Applications with accepted terms.",
        value: managerApplicationSummaryMockData.acceptedOffers,
        icon: CheckCircle2,
      },
    ];
  }

  const openApplications = applications.filter(
    (app) => app.status === "submitted" || app.status === "open",
  ).length;

  const needsReview = applications.filter(
    (app) => app.status === "submitted",
  ).length;

  const offersSent = applications.reduce(
    (sum, app) =>
      sum +
      app.offerCounts.pending +
      app.offerCounts.accepted +
      app.offerCounts.declined +
      app.offerCounts.expired,
    0,
  );

  const acceptedOffers = applications.filter(
    (app) => app.acceptedOffer !== null,
  ).length;

  return [
    {
      label: "Open applications",
      description: "Applications currently available for review.",
      value: openApplications,
      icon: FileText,
    },
    {
      label: "Needs review",
      description: "Applications waiting for manager attention.",
      value: needsReview,
      icon: ClipboardCheck,
    },
    {
      label: "Offers sent",
      description: "Total lender offers linked to applications.",
      value: offersSent,
      icon: Send,
    },
    {
      label: "Accepted offers",
      description: "Applications with accepted terms.",
      value: acceptedOffers,
      icon: CheckCircle2,
    },
  ];
}

export function ApplicationSummaryCards({
  applications,
}: {
  applications: ManagerApplicationRow[];
}) {
  const cards = buildSummaryCards(applications);

  return (
    <section
      aria-label="Application summary"
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
              {numberFormatter.format(card.value)}
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

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  ManagerDashboardKpi,
  ManagerMonthlyActivityRow,
} from "@/lib/manager-dashboard";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function PlatformSnapshot({
  kpis,
  monthlyActivity,
}: {
  kpis: ManagerDashboardKpi[];
  monthlyActivity: ManagerMonthlyActivityRow[];
}) {
  const totals = {
    applications: monthlyActivity.reduce(
      (sum, row) => sum + row.applications,
      0,
    ),
    offers: monthlyActivity.reduce((sum, row) => sum + row.offers, 0),
    loans: monthlyActivity.reduce((sum, row) => sum + row.loans, 0),
  };

  const offerRate =
    totals.applications > 0 ? totals.offers / totals.applications : null;

  const fundingRate =
    totals.offers > 0
      ? totals.loans / totals.offers
      : totals.applications > 0
        ? totals.loans / totals.applications
        : null;

  const pipelineMetrics = [
    { label: "Applications", value: numberFormatter.format(totals.applications) },
    { label: "Offers", value: numberFormatter.format(totals.offers) },
    { label: "Funded", value: numberFormatter.format(totals.loans) },
    {
      label: "Offer rate",
      value: offerRate !== null ? percentFormatter.format(offerRate) : "\u2014",
    },
    {
      label: "Funding rate",
      value:
        fundingRate !== null ? percentFormatter.format(fundingRate) : "\u2014",
    },
  ];

  return (
    <Card className="border-border/70 bg-card/95 shadow-[0_18px_50px_rgba(14,26,18,0.05)]">
      <CardHeader className="pb-2">
        <CardTitle>Platform snapshot</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {kpis.map((kpi, index) => (
            <div key={kpi.label} className="contents">
              {index > 0 && index % 2 === 0 && (
                <Separator
                  orientation="horizontal"
                  className="col-span-full sm:hidden"
                />
              )}
              <Link
                href={kpi.href}
                className="group flex flex-col gap-0.5 rounded-md px-1 py-0.5 outline-none transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="text-xs text-muted-foreground">
                  {kpi.label}
                </span>
                <span className="text-xl font-semibold tracking-tight tabular-nums">
                  {numberFormatter.format(kpi.value)}
                </span>
              </Link>
            </div>
          ))}
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Current pipeline
          </span>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-5">
            {pipelineMetrics.map((metric) => (
              <div key={metric.label} className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {metric.label}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

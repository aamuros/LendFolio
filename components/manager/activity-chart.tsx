"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ManagerMonthlyActivityRow } from "@/lib/manager-dashboard";

const chartConfig = {
  activity: {
    label: "Activity",
  },
  applications: {
    label: "Applications",
    color: "var(--chart-1)",
  },
  offers: {
    label: "Offers",
    color: "var(--chart-2)",
  },
  loans: {
    label: "Loans Funded",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type ActivityMetric = "applications" | "offers" | "loans";

export function ActivityChart({
  data,
}: {
  data: ManagerMonthlyActivityRow[];
}) {
  const [activeMetric, setActiveMetric] =
    React.useState<ActivityMetric>("applications");

  const monthsWithData = React.useMemo(
    () =>
      data.filter(
        (row) => row.applications + row.offers + row.loans > 0,
      ).length,
    [data],
  );

  const metrics: ActivityMetric[] = ["applications", "offers", "loans"];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-0 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Platform activity</CardTitle>
          <CardDescription>
            {monthsWithData >= 3
              ? "Monthly lending activity across the platform"
              : "Trends will become more useful after 3+ active months."}
          </CardDescription>
        </div>
        <div className="flex gap-1 pt-2 sm:pt-0">
          {metrics.map((metric) => (
            <button
              key={metric}
              data-active={activeMetric === metric}
              className="rounded-md px-2 py-0.5 text-xs font-medium transition-colors data-[active=true]:bg-muted data-[active=true]:text-foreground text-muted-foreground hover:bg-muted/50"
              onClick={() => setActiveMetric(metric)}
            >
              {chartConfig[metric].label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const [year, month] = value.split("-");
                const date = new Date(
                  Date.UTC(Number(year), Number(month) - 1, 1),
                );
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                  timeZone: "UTC",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="activity"
                  labelFormatter={(value) => {
                    const str = String(value ?? "");
                    const [year, month] = str.split("-");
                    const date = new Date(
                      Date.UTC(Number(year), Number(month) - 1, 1),
                    );
                    return date.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    });
                  }}
                />
              }
            />
            <Bar
              dataKey={activeMetric}
              fill={`var(--color-${activeMetric})`}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

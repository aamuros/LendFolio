"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const chartData = [
  { date: "2026-05-01", applications: 3, approvals: 1, repayments: 2, verifications: 1 },
  { date: "2026-05-05", applications: 5, approvals: 2, repayments: 3, verifications: 2 },
  { date: "2026-05-09", applications: 2, approvals: 1, repayments: 4, verifications: 1 },
  { date: "2026-05-13", applications: 7, approvals: 3, repayments: 2, verifications: 3 },
  { date: "2026-05-17", applications: 4, approvals: 2, repayments: 5, verifications: 2 },
  { date: "2026-05-21", applications: 6, approvals: 4, repayments: 3, verifications: 4 },
  { date: "2026-05-25", applications: 3, approvals: 1, repayments: 6, verifications: 1 },
  { date: "2026-05-29", applications: 8, approvals: 5, repayments: 4, verifications: 3 },
  { date: "2026-06-02", applications: 5, approvals: 3, repayments: 3, verifications: 2 },
  { date: "2026-06-06", applications: 4, approvals: 2, repayments: 5, verifications: 3 },
  { date: "2026-06-10", applications: 9, approvals: 6, repayments: 4, verifications: 5 },
  { date: "2026-06-14", applications: 6, approvals: 3, repayments: 7, verifications: 2 },
  { date: "2026-06-18", applications: 3, approvals: 2, repayments: 3, verifications: 1 },
  { date: "2026-06-22", applications: 7, approvals: 4, repayments: 5, verifications: 4 },
  { date: "2026-06-26", applications: 5, approvals: 3, repayments: 6, verifications: 3 },
  { date: "2026-06-30", applications: 8, approvals: 5, repayments: 4, verifications: 5 },
  { date: "2026-07-04", applications: 4, approvals: 2, repayments: 3, verifications: 2 },
  { date: "2026-07-08", applications: 6, approvals: 4, repayments: 5, verifications: 3 },
  { date: "2026-07-12", applications: 10, approvals: 7, repayments: 6, verifications: 6 },
  { date: "2026-07-16", applications: 5, approvals: 3, repayments: 4, verifications: 2 },
  { date: "2026-07-20", applications: 7, approvals: 4, repayments: 7, verifications: 4 },
  { date: "2026-07-24", applications: 3, approvals: 2, repayments: 3, verifications: 1 },
  { date: "2026-07-28", applications: 9, approvals: 6, repayments: 5, verifications: 5 },
  { date: "2026-08-01", applications: 6, approvals: 3, repayments: 4, verifications: 3 },
  { date: "2026-08-05", applications: 4, approvals: 2, repayments: 6, verifications: 2 },
  { date: "2026-08-09", applications: 8, approvals: 5, repayments: 5, verifications: 4 },
  { date: "2026-08-13", applications: 5, approvals: 3, repayments: 3, verifications: 3 },
  { date: "2026-08-17", applications: 7, approvals: 4, repayments: 7, verifications: 5 },
  { date: "2026-08-21", applications: 11, approvals: 7, repayments: 6, verifications: 6 },
  { date: "2026-08-25", applications: 6, approvals: 4, repayments: 4, verifications: 3 },
  { date: "2026-08-29", applications: 4, approvals: 2, repayments: 5, verifications: 2 },
  { date: "2026-09-02", applications: 9, approvals: 6, repayments: 8, verifications: 5 },
  { date: "2026-09-06", applications: 5, approvals: 3, repayments: 4, verifications: 3 },
  { date: "2026-09-10", applications: 7, approvals: 4, repayments: 6, verifications: 4 },
  { date: "2026-09-14", applications: 3, approvals: 2, repayments: 3, verifications: 1 },
  { date: "2026-09-18", applications: 10, approvals: 7, repayments: 7, verifications: 6 },
  { date: "2026-09-22", applications: 6, approvals: 3, repayments: 5, verifications: 3 },
  { date: "2026-09-26", applications: 8, approvals: 5, repayments: 4, verifications: 4 },
  { date: "2026-09-30", applications: 5, approvals: 3, repayments: 6, verifications: 2 },
];

const chartConfig = {
  applications: {
    label: "Applications",
    color: "var(--chart-1)",
  },
  approvals: {
    label: "Approvals",
    color: "var(--chart-2)",
  },
  repayments: {
    label: "Repayments",
    color: "var(--chart-3)",
  },
  verifications: {
    label: "Verifications",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const REFERENCE_DATE = new Date("2026-09-30");

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTooltipLabel(value: unknown) {
  return new Date(String(value)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ManagerActivityChart() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  const effectiveRange = isMobile && timeRange === "90d" ? "30d" : timeRange;
  const handleRangeChange = React.useCallback(
    (value: string) => {
      setTimeRange(value);
    },
    [],
  );

  const filteredData = React.useMemo(() => {
    let daysToSubtract = 90;
    if (effectiveRange === "30d") {
      daysToSubtract = 30;
    } else if (effectiveRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(REFERENCE_DATE);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return chartData.filter((item) => new Date(item.date) >= startDate);
  }, [effectiveRange]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Platform activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Applications, approvals, repayments, and verifications
          </span>
          <span className="@[540px]/card:hidden">Platform metrics</span>
        </CardDescription>
        <CardAction>
          <Select value={effectiveRange} onValueChange={handleRangeChange}>
            <SelectTrigger
              className="w-36"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient
                id="fillApplications"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-applications)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-applications)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="fillApprovals"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-approvals)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-approvals)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="fillRepayments"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-repayments)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-repayments)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="fillVerifications"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-verifications)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-verifications)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDateLabel}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={formatTooltipLabel}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="verifications"
              type="natural"
              fill="url(#fillVerifications)"
              stroke="var(--color-verifications)"
              stackId="a"
            />
            <Area
              dataKey="repayments"
              type="natural"
              fill="url(#fillRepayments)"
              stroke="var(--color-repayments)"
              stackId="a"
            />
            <Area
              dataKey="approvals"
              type="natural"
              fill="url(#fillApprovals)"
              stroke="var(--color-approvals)"
              stackId="a"
            />
            <Area
              dataKey="applications"
              type="natural"
              fill="url(#fillApplications)"
              stroke="var(--color-applications)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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
import type { ManagerMonthlyRevenueRow } from "@/lib/manager-dashboard";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const compactPesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
});

const chartConfig = {
  revenue: {
    label: "Processing fee revenue",
    color: "var(--chart-2)",
  },
  fundedLoans: {
    label: "Funded loans",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function RevenueChart({
  data,
}: {
  data: ManagerMonthlyRevenueRow[];
}) {
  const hasRevenue = data.some((row) => row.revenue > 0);

  return (
    <Card className="min-w-0 border-border/70 bg-card/95 shadow-[0_18px_50px_rgba(14,26,18,0.05)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">System revenue</CardTitle>
        <CardDescription>
          Monthly processing fee revenue from funded loans.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {!hasRevenue && (
            <div className="pointer-events-none absolute inset-x-4 top-8 z-10 rounded-md border border-dashed border-border/80 bg-background/85 px-3 py-2 text-sm text-muted-foreground shadow-sm">
              Revenue will appear here after funded loans include processing
              fees.
            </div>
          )}
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[210px] w-full"
          >
            <LineChart
              accessibilityLayer
              data={data}
              margin={{
                left: 8,
                right: 12,
                top: 8,
                bottom: 0,
              }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.75}
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatMonthTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={60}
                tickFormatter={(value) =>
                  compactPesoFormatter.format(Number(value))
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[190px]"
                    nameKey="revenue"
                    labelFormatter={formatMonthLabel}
                    formatter={(value, name, item) => {
                      const payload = item.payload as
                        | ManagerMonthlyRevenueRow
                        | undefined;

                      return (
                        <>
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                            style={{
                              backgroundColor: "var(--color-revenue)",
                            }}
                          />
                          <div className="grid flex-1 gap-1.5">
                            <span className="text-muted-foreground">
                              {chartConfig.revenue.label}
                            </span>
                            <span className="font-mono font-medium tabular-nums text-foreground">
                              {pesoFormatter.format(Number(value ?? 0))}
                            </span>
                            <span className="text-muted-foreground">
                              {payload?.fundedLoans ?? 0} funded loans
                            </span>
                          </div>
                        </>
                      );
                    }}
                  />
                }
              />
              <Line
                dataKey="revenue"
                type="monotone"
                stroke="var(--color-revenue)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMonthTick(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function formatMonthLabel(value: unknown) {
  const str = String(value ?? "");
  const [year, month] = str.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

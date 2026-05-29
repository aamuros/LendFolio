"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  ManagerMonthlyUserHeadcount,
  ManagerUserStatusDistribution,
} from "@/lib/manager-dashboard";
import { useMemo } from "react";

const headcountChartConfig = {
  active: {
    label: "Active",
    color: "var(--chart-1)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-2)",
  },
  suspended: {
    label: "Suspended",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const statusChartColors: Record<string, string> = {
  active: "var(--chart-1)",
  pending: "var(--chart-2)",
  suspended: "var(--chart-3)",
};

export function UserHeadcountBarChart({
  data,
}: {
  data: ManagerMonthlyUserHeadcount[];
}) {
  return (
    <ChartContainer config={headcountChartConfig} className="h-[250px] w-full">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
        />
        <ChartTooltip
          content={<ChartTooltipContent indicator="dot" />}
          cursor={false}
        />
        <Bar dataKey="active" stackId="users" fill="var(--color-active)" />
        <Bar dataKey="pending" stackId="users" fill="var(--color-pending)" />
        <Bar
          dataKey="suspended"
          stackId="users"
          fill="var(--color-suspended)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

const statusPieConfig = {
  active: {
    label: "Active",
    color: "var(--chart-1)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-2)",
  },
  suspended: {
    label: "Suspended",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function UserStatusPieChart({
  data,
  total,
}: {
  data: ManagerUserStatusDistribution[];
  total: number;
}) {
  const chartData = useMemo(() => data.filter((item) => item.count > 0), [data]);

  return (
    <div className="relative mx-auto w-full max-w-[220px]">
      <ChartContainer
        config={statusPieConfig}
        className="aspect-square w-full"
      >
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent hideLabel />}
            cursor={false}
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            innerRadius={60}
            outerRadius={90}
            strokeWidth={2}
            stroke="var(--background)"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.status}
                fill={statusChartColors[entry.status] ?? "var(--muted)"}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">
          {total.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">users</span>
      </div>
    </div>
  );
}

export { statusChartColors };

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRightIcon } from "lucide-react";
import type {
  BusinessType,
  ManagerLenderPerformanceRow,
} from "@/lib/manager-dashboard";
import { ManagerEmptyState } from "@/components/manager/manager-empty-state";

const numberFormatter = new Intl.NumberFormat("en-US");
const businessTypeLabels: Record<BusinessType, string> = {
  sari_sari_store: "Sari-sari store",
  food_stall: "Food stall",
  online_seller: "Online seller",
  market_vendor: "Market vendor",
  service_provider: "Service provider",
  other: "Other",
};
const businessTypeOptions: BusinessType[] = [
  "sari_sari_store",
  "food_stall",
  "online_seller",
  "market_vendor",
  "service_provider",
  "other",
];

type SelectedBusinessType = "all" | BusinessType;
type LenderPerformanceViewRow = {
  id: string;
  displayName: string;
  shortId: string;
  completedApplicationCount: number;
  acceptedOfferCount: number;
  activeLoanCount: number;
  href: string;
};

export function LenderPerformancePanel({
  rows,
}: {
  rows: ManagerLenderPerformanceRow[];
}) {
  const [selectedBusinessType, setSelectedBusinessType] =
    useState<SelectedBusinessType>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(rows, selectedBusinessType),
    [rows, selectedBusinessType],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Lender performance</CardTitle>
            <CardDescription>
              Top lenders by completed applications
            </CardDescription>
          </div>
        </div>
        <div className="pt-2">
          <Select
            value={selectedBusinessType}
            onValueChange={(value) =>
              setSelectedBusinessType(value as SelectedBusinessType)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All business types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All business types</SelectItem>
              {businessTypeOptions.map((businessType) => (
                <SelectItem key={businessType} value={businessType}>
                  {businessTypeLabels[businessType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          visibleRows.length > 0 ? (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Lender</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-right">Accepted</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {row.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.shortId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary">
                            {numberFormatter.format(
                              row.completedApplicationCount,
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.acceptedOfferCount}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.activeLoanCount}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon-xs" asChild>
                            <Link href={row.href}>
                              <ArrowUpRightIcon className="size-3" />
                              <span className="sr-only">
                                View {row.displayName}
                              </span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-2 md:hidden">
                {visibleRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <p className="truncate text-sm font-medium">
                          {row.displayName}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.shortId}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
                          {numberFormatter.format(row.completedApplicationCount)} completed
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.acceptedOfferCount} accepted
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.activeLoanCount} active
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-xs" asChild>
                      <Link href={row.href}>
                        <ArrowUpRightIcon className="size-3" />
                        <span className="sr-only">
                          View {row.displayName}
                        </span>
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ManagerEmptyState
              title="No lender activity found"
              description="Try another business type or wait for accepted offers and active loans."
            />
          )
        ) : (
          <ManagerEmptyState
            title="No lender activity yet"
            description="Lender performance will appear after offers are accepted and loans are activated."
          />
        )}
      </CardContent>
    </Card>
  );
}

function getVisibleRows(
  rows: ManagerLenderPerformanceRow[],
  selectedBusinessType: SelectedBusinessType,
): LenderPerformanceViewRow[] {
  if (selectedBusinessType === "all") {
    return rows
      .map((row) => ({
        id: row.id,
        displayName: row.displayName,
        shortId: row.shortId,
        completedApplicationCount: row.completedApplicationCount,
        acceptedOfferCount: row.acceptedOfferCount,
        activeLoanCount: row.activeLoanCount,
        href: row.href,
      }))
      .slice(0, 6);
  }

  return rows
    .flatMap((row) => {
      const performance = row.businessTypePerformance.find(
        (item) => item.businessType === selectedBusinessType,
      );

      if (!performance) return [];

      return [
        {
          id: row.id,
          displayName: row.displayName,
          shortId: row.shortId,
          completedApplicationCount: performance.completedApplicationCount,
          acceptedOfferCount: performance.acceptedOfferCount,
          activeLoanCount: performance.activeLoanCount,
          href: row.href,
        },
      ];
    })
    .filter(
      (row) =>
        row.completedApplicationCount > 0 ||
        row.acceptedOfferCount > 0 ||
        row.activeLoanCount > 0,
    )
    .sort(
      (a, b) =>
        b.completedApplicationCount - a.completedApplicationCount ||
        b.activeLoanCount - a.activeLoanCount ||
        a.displayName.localeCompare(b.displayName),
    )
    .slice(0, 6);
}

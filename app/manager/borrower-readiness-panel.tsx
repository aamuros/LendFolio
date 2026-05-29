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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ManagerBorrowerPerformanceRow } from "@/lib/manager-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon } from "lucide-react";

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  paid: "default",
  verified: "default",
  accepted: "default",
  approved: "default",
  submitted: "secondary",
  pending: "secondary",
  due: "secondary",
  open: "secondary",
  rejected: "destructive",
  overdue: "destructive",
  defaulted: "destructive",
  declined: "destructive",
  late: "destructive",
  suspended: "destructive",
  closed: "outline",
  withdrawn: "outline",
  expired: "outline",
};

export function BorrowerReadinessPanel({
  rows,
}: {
  rows: ManagerBorrowerPerformanceRow[];
}) {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!trimmedQuery) return rows;

    return rows.filter((row) => {
      const displayName = row.displayName.toLowerCase();
      const shortId = row.shortId.toLowerCase();

      return (
        displayName.includes(trimmedQuery) || shortId.includes(trimmedQuery)
      );
    });
  }, [rows, trimmedQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Borrower readiness</CardTitle>
        <CardDescription>
          Credit scoring is planned; this preview uses current repayment and
          application activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <div className="grid gap-3">
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search borrowers"
            />
            {filteredRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead className="text-right">Verified</TableHead>
                    <TableHead className="text-right">Risk</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {row.displayName}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {row.shortId}
                            </span>
                            <Badge
                              variant={
                                statusVariantMap[row.status] ?? "secondary"
                              }
                              className="text-[10px]"
                            >
                              {row.status}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold tabular-nums text-primary">
                          {row.previewScore}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.acceptedApplicationCount}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {row.verifiedRepaymentCount}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <span
                          className={
                            row.riskFlagCount > 0
                              ? "font-medium text-destructive"
                              : "tabular-nums"
                          }
                        >
                          {row.riskFlagCount}
                        </span>
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
            ) : (
              <DashboardEmptyState
                title="No borrowers found"
                description="Try a name or short ID from the readiness list."
              />
            )}
          </div>
        ) : (
          <DashboardEmptyState
            title="No borrower activity yet"
            description="Borrower readiness will appear after applications, loans, or repayment activity exist."
          />
        )}
      </CardContent>
    </Card>
  );
}

function DashboardEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
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
import { ManagerEmptyState } from "@/components/manager/manager-empty-state";
import {
  formatCreditProfileGrade,
  getGradeTone,
  type BorrowerCreditProfileGrade,
} from "@/lib/borrower-credit-profile-grade";

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

function GradeDisplay({ grade }: { grade: string | null }) {
  if (!grade) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }

  const validGrades: BorrowerCreditProfileGrade[] = [
    "A",
    "B",
    "C",
    "review_needed",
    "not_eligible",
    "incomplete",
  ];
  const isValid = validGrades.includes(grade as BorrowerCreditProfileGrade);
  const tone = isValid
    ? getGradeTone(grade as BorrowerCreditProfileGrade)
    : "neutral";
  const toneClasses: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-800",
    attention: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    neutral: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex size-10 items-center justify-center rounded-lg text-sm font-semibold tabular-nums ${toneClasses[tone] ?? toneClasses.neutral}`}
    >
      {isValid
        ? formatCreditProfileGrade(grade as BorrowerCreditProfileGrade)
        : grade}
    </span>
  );
}

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
        <div aria-hidden className="h-10" />
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length > 0 ? (
          <div className="grid gap-3">
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search borrowers"
            />
            {filteredRows.length > 0 ? (
              <>
                <div className="hidden md:block">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Borrower</TableHead>
                        <TableHead className="w-[72px] text-center">Grade</TableHead>
                        <TableHead className="w-[84px] text-right">Accepted</TableHead>
                        <TableHead className="w-[84px] text-right">Verified</TableHead>
                        <TableHead className="w-[64px] text-right">Risk</TableHead>
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
                            <GradeDisplay grade={row.creditProfileGrade} />
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
                </div>

                <div className="grid gap-2 md:hidden">
                  {filteredRows.map((row, index) => (
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
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <GradeDisplay grade={row.creditProfileGrade} />
                          <span className="text-xs text-muted-foreground">
                            {row.acceptedApplicationCount} accepted
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.verifiedRepaymentCount} verified
                          </span>
                          <span
                            className={
                              row.riskFlagCount > 0
                                ? "text-xs font-medium text-destructive"
                                : "text-xs tabular-nums text-muted-foreground"
                            }
                          >
                            {row.riskFlagCount} risk
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
                title="No borrowers found"
                description="Try a name or short ID from the readiness list."
              />
            )}
          </div>
        ) : (
          <ManagerEmptyState
            title="No borrower activity yet"
            description="Borrower readiness will appear after applications, loans, or repayment activity exist."
            className="min-h-[240px]"
          />
        )}
      </CardContent>
    </Card>
  );
}

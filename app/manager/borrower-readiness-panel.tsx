"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ManagerBorrowerPerformanceRow } from "@/lib/manager-dashboard";

const numberFormatter = new Intl.NumberFormat("en-US");
const managerStatusLabels = {
  active: "Active",
  paid: "Paid",
  overdue: "Overdue",
  defaulted: "Defaulted",
  closed: "Closed",
  submitted: "Submitted",
  open: "Open",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  pending: "Pending",
  expired: "Expired",
  due: "Due",
  verified: "Verified",
  rejected: "Rejected",
  late: "Late",
  suspended: "Suspended",
} as const;

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
    <DataCard>
      <PanelHeader
        title="Borrower readiness"
        description="Credit scoring is planned; this preview uses current repayment and application activity."
      />
      {rows.length > 0 ? (
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            <span className="sr-only">Search borrowers</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search borrowers"
              className="h-10 w-full rounded-full border border-[var(--border)] bg-white px-4 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            />
          </label>
          {filteredRows.length > 0 ? (
            <ol className="grid gap-2">
              {filteredRows.map((row, index) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--primary)]"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-[var(--muted)] text-xs font-semibold text-[var(--muted-foreground)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {row.displayName}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {row.shortId}
                          </span>
                          <StatusBadge status={row.status} />
                        </div>
                      </div>
                      <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#cbe8e4] bg-[#e8f6f3] text-center text-[#0f5f45]">
                        <p className="text-lg leading-none font-semibold">
                          {row.previewScore}
                        </p>
                        <p className="text-[10px] font-semibold">preview</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <MetricChip
                        value={row.acceptedApplicationCount}
                        label="accepted apps"
                      />
                      <MetricChip
                        value={row.verifiedRepaymentCount}
                        label="verified repayments"
                      />
                      <MetricChip
                        value={row.riskFlagCount}
                        label="risk flags"
                      />
                      <MetricChip
                        value={row.activeLoanCount}
                        label="active loans"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
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
    </DataCard>
  );
}

function PanelHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#f7dfac] bg-[#fff7df] text-[#806000]"
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M8.75 11.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM4.5 19.25c.55-3.05 2.05-4.6 4.25-4.6s3.7 1.55 4.25 4.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 8.5h4M17.5 6.5v4M15 15.25l1.6 1.6 3.15-3.35"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function MetricChip({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]/25 px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)]">
      <span className="text-[var(--foreground)]">
        {numberFormatter.format(value)}
      </span>
      {label}
    </span>
  );
}

function DataCard({ children }: { children: ReactNode }) {
  return (
    <article className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5">
      {children}
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const positive = ["verified", "paid", "accepted", "active", "approved"];
  const warning = ["submitted", "pending", "due", "open"];
  const danger = [
    "rejected",
    "overdue",
    "defaulted",
    "declined",
    "late",
    "suspended",
  ];
  const muted = ["closed", "withdrawn", "expired"];
  const className = positive.includes(status)
    ? "bg-[#e1f5ee] text-[#0f5f45]"
    : warning.includes(status)
      ? "bg-[#fff7df] text-[#806000]"
      : danger.includes(status)
        ? "bg-[#fff4f4] text-[#8f1d1d]"
        : muted.includes(status)
          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
          : "bg-[#f7f9fc] text-[var(--foreground)]";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {managerStatusLabels[status as keyof typeof managerStatusLabels] ??
        status}
    </span>
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
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)]/20 px-4 py-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

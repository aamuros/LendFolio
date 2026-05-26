"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type {
  BusinessType,
  ManagerLenderPerformanceRow,
} from "@/lib/manager-dashboard";

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
    <DataCard>
      <div className="grid gap-3">
        <PanelHeader
          title="Lender performance"
          description="Top lenders by completed applications"
          icon={<BriefcaseIcon />}
        />
        <label className="grid gap-1 text-sm font-semibold">
          <span className="sr-only">Business type</span>
          <select
            value={selectedBusinessType}
            onChange={(event) =>
              setSelectedBusinessType(event.target.value as SelectedBusinessType)
            }
            className="h-10 w-full rounded-full border border-[var(--border)] bg-white px-4 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            <option value="all">All business types</option>
            {businessTypeOptions.map((businessType) => (
              <option key={businessType} value={businessType}>
                {businessTypeLabels[businessType]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {rows.length > 0 ? (
        visibleRows.length > 0 ? (
          <ol className="grid gap-2">
            {visibleRows.map((row, index) => (
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
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {row.shortId}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-[#e8f6f3] px-3 py-2 text-right text-[#0f5f45]">
                      <p className="text-lg leading-none font-semibold">
                        {numberFormatter.format(row.completedApplicationCount)}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold">
                        completed
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MetricChip
                      value={row.acceptedOfferCount}
                      label="accepted offers"
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
            title="No lender activity found"
            description="Try another business type or wait for accepted offers and active loans."
          />
        )
      ) : (
        <DashboardEmptyState
          title="No lender activity yet"
          description="Lender performance will appear after offers are accepted and loans are activated."
        />
      )}
    </DataCard>
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

function PanelHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#cbe8e4] bg-[#e8f6f3] text-[#0f5f45]"
      >
        {icon}
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

function BriefcaseIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M8.25 7.75v-1.5a1.5 1.5 0 0 1 1.5-1.5h4.5a1.5 1.5 0 0 1 1.5 1.5v1.5M5.25 7.75h13.5v10.5H5.25z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 11.25h13.5M10 11.25v1.5h4v-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

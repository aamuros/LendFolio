"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  WalletCards,
} from "lucide-react";
import {
  type LenderApplicationReview,
} from "@/lib/lender-applications";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BorrowerCard } from "@/components/borrower/ui";
import { ToneBadge } from "@/components/borrower-status-badge";
import { cn } from "@/lib/utils";

type LenderApplicationsListProps = {
  applications: LenderApplicationReview[];
  emptyDescription?: string;
  emptyTitle?: string;
};

type AmountFilter =
  | "any"
  | "below_5000"
  | "5000_10000"
  | "10000_25000"
  | "above_25000";
type OfferStatusFilter = "all" | "no_offer" | "offer_sent" | "reviewed";
type SortOption =
  | "newest"
  | "oldest"
  | "amount_asc"
  | "amount_desc"
  | "term_asc"
  | "net_revenue_desc";

const filterKeys = {
  search: "applicationSearch",
  term: "applicationTerm",
  amount: "applicationAmount",
  offerStatus: "applicationOfferStatus",
  sort: "applicationSort",
} as const;
const removedFilterKeys = ["applicationPurpose"] as const;

const amountFilterLabels: Record<AmountFilter, string> = {
  any: "Any amount",
  below_5000: "Below PHP 5,000",
  "5000_10000": "PHP 5,000 - PHP 10,000",
  "10000_25000": "PHP 10,000 - PHP 25,000",
  above_25000: "Above PHP 25,000",
};

const offerStatusFilterLabels: Record<OfferStatusFilter, string> = {
  all: "All",
  no_offer: "No offer yet",
  offer_sent: "Offer sent",
  reviewed: "Reviewed",
};

const sortLabels: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  amount_asc: "Requested amount: low to high",
  amount_desc: "Requested amount: high to low",
  term_asc: "Shortest term first",
  net_revenue_desc: "Highest net revenue first",
};

const preferredTermLabels: Record<
  LenderApplicationReview["preferredTerm"],
  string
> = {
  "1_month": "1 month",
  "3_months": "3 months",
  "6_months": "6 months",
  "12_months": "12 months",
};

const fallbackTermMonths = [1, 2, 3, 4, 6, 9, 12];
const actionableApplicationStatuses = ["submitted", "open"] as const;

function applicationStatusTone(status: string) {
  switch (status) {
    case "submitted":
      return "attention" as const;
    case "approved":
      return "success" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function offerStateTone(
  state: LenderApplicationReview["currentLenderOfferState"],
) {
  switch (state) {
    case "offer_accepted":
      return "success" as const;
    case "offer_declined":
      return "danger" as const;
    case "offer_pending":
      return "attention" as const;
    case "offer_expired":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

export function LenderApplicationsList({
  applications,
  emptyDescription = "New borrower applications will appear here.",
  emptyTitle = "No open applications",
}: LenderApplicationsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get(filterKeys.search) ?? "";
  const rawTerm = searchParams.get(filterKeys.term) ?? "all";
  const amount = normalizeAmountFilter(searchParams.get(filterKeys.amount));
  const offerStatus = normalizeOfferStatusFilter(
    searchParams.get(filterKeys.offerStatus),
  );
  const sort = normalizeSortOption(searchParams.get(filterKeys.sort));

  useEffect(() => {
    if (!removedFilterKeys.some((key) => searchParams.has(key))) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    removedFilterKeys.forEach((key) => params.delete(key));
    const nextQuery = serializeSearchParams(params);

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const terms = useMemo(
    () =>
      [
        ...new Set([
          ...fallbackTermMonths,
          ...applications.map((application) => getTermMonths(application)),
        ]),
      ].sort((a, b) => a - b),
    [applications],
  );
  const term = terms.some((termOption) => String(termOption) === rawTerm)
    ? rawTerm
    : "all";
  const filteredApplications = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search);

    return applications
      .filter((application) => {
        const searchableText = buildSearchText(application);

        if (normalizedSearch && !searchableText.includes(normalizedSearch)) {
          return false;
        }

        if (term !== "all" && getTermMonths(application) !== Number(term)) {
          return false;
        }

        if (!matchesAmountFilter(application.requestedAmount, amount)) {
          return false;
        }

        return matchesOfferStatusFilter(application, offerStatus);
      })
      .sort((a, b) => compareApplications(a, b, sort));
  }, [amount, applications, offerStatus, search, sort, term]);

  const hasActiveFilters =
    search.length > 0 ||
    term !== "all" ||
    amount !== "any" ||
    offerStatus !== "all" ||
    sort !== "newest";

  function setFilter(key: keyof typeof filterKeys, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const paramKey = filterKeys[key];
    const defaultValue =
      key === "sort" ? "newest" : key === "search" ? "" : "all";

    removedFilterKeys.forEach((removedKey) => params.delete(removedKey));

    if (key === "amount" && value === "any") {
      params.delete(paramKey);
    } else if (value === defaultValue) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, value);
    }

    const nextQuery = serializeSearchParams(params);

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    Object.values(filterKeys).forEach((key) => params.delete(key));
    removedFilterKeys.forEach((key) => params.delete(key));
    const nextQuery = serializeSearchParams(params);

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  if (applications.length === 0) {
    return (
      <BorrowerCard variant="dashed">
        <CardContent className="grid gap-3 p-5 text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-xl border border-border/80 bg-muted/60 text-muted-foreground">
            <WalletCards className="size-4" />
          </span>
          <p className="text-lg font-semibold">{emptyTitle}</p>
          <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
            {emptyDescription}
          </p>
        </CardContent>
      </BorrowerCard>
    );
  }

  return (
    <div className="grid gap-5 pt-1">
      <div className="grid gap-3 rounded-2xl border border-border/75 bg-card/75 p-4 shadow-[0_8px_20px_rgba(15,23,18,0.04)] sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(155px,1fr))]">
          <label className="relative block">
            <span className="sr-only">Search applications</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Search applications"
              className="box-border h-10 rounded-xl bg-background pl-9 focus-visible:border-[#33423c]/55 focus-visible:ring-0 focus-visible:shadow-[0_0_0_2px_rgba(51,66,60,0.14)]"
            />
          </label>

          <FilterSelect
            label="Term"
            value={term}
            onValueChange={(value) => setFilter("term", value)}
            options={[
              { label: "Any term", value: "all" },
              ...terms.map((termOption) => ({
                label: formatTermMonths(termOption),
                value: String(termOption),
              })),
            ]}
          />
          <FilterSelect
            label="Amount"
            value={amount}
            onValueChange={(value) => setFilter("amount", value)}
            options={Object.entries(amountFilterLabels).map(([value, label]) => ({
              label,
              value,
            }))}
          />
          <FilterSelect
            label="Offer status"
            value={offerStatus}
            onValueChange={(value) => setFilter("offerStatus", value)}
            options={Object.entries(offerStatusFilterLabels).map(([value, label]) => ({
              label,
              value,
            }))}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            onValueChange={(value) => setFilter("sort", value)}
            options={Object.entries(sortLabels).map(([value, label]) => ({
              label,
              value,
            }))}
          />
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
                Active
              </span>
              {search ? <FilterChip label={`Search: ${search}`} /> : null}
              {term !== "all" ? (
                <FilterChip label={`Term: ${formatTermMonths(Number(term))}`} />
              ) : null}
              {amount !== "any" ? (
                <FilterChip label={amountFilterLabels[amount]} />
              ) : null}
              {offerStatus !== "all" ? (
                <FilterChip label={offerStatusFilterLabels[offerStatus]} />
              ) : null}
              {sort !== "newest" ? <FilterChip label={sortLabels[sort]} /> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl px-3 text-muted-foreground sm:shrink-0"
              onClick={clearFilters}
            >
              <X className="size-4" />
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>

      {filteredApplications.length === 0 ? (
        <BorrowerCard variant="dashed">
          <CardContent className="grid gap-3 p-5 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-xl border border-border/80 bg-muted/60 text-muted-foreground">
              <WalletCards className="size-4" />
            </span>
            <p className="text-lg font-semibold">
              No applications match your filters.
            </p>
            <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
              Adjust the filters or clear them to see open applications again.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mx-auto rounded-xl"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </CardContent>
        </BorrowerCard>
      ) : null}

      {filteredApplications.map((application) => (
        <BorrowerCard key={application.id} className="overflow-hidden">
          <CardContent className="grid gap-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="grid min-w-0 gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="min-w-0 truncate text-base font-semibold sm:text-lg">
                  {application.portfolio.businessTypeLabel}
                </h2>
                <ToneBadge tone={applicationStatusTone(application.status)}>
                  {application.status}
                </ToneBadge>
                <ToneBadge tone={offerStateTone(application.currentLenderOfferState)}>
                  {offerStateLabels[application.currentLenderOfferState]}
                </ToneBadge>
              </div>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {application.purpose ?? "No purpose stated"}
                </p>
                <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="min-w-0 truncate">
                    {application.portfolio.location}
                  </span>
                </p>
              </div>
              <Button
                asChild
                className="h-10 rounded-xl font-semibold sm:justify-self-end"
              >
                <Link href={`/lender/applications/${application.id}`}>
                  {isApplicationActionableForOffer(application)
                    ? "Review"
                    : "View"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <dl className="grid gap-2 text-sm sm:grid-cols-4">
              <SummaryItem
                label="Requested"
                value={`PHP ${formatCurrency(application.requestedAmount)}`}
                icon={<WalletCards className="size-3.5" />}
              />
              <SummaryItem
                label="Term"
                value={formatPreferredTerm(application.preferredTerm)}
                icon={<Clock className="size-3.5" />}
              />
              <SummaryItem
                label="Net revenue"
                value={`PHP ${formatCurrency(application.financialIndicators.estimatedNetMonthlyRevenue)}`}
                icon={<WalletCards className="size-3.5" />}
              />
              <SummaryItem
                label="Submitted"
                value={formatDate(application.submittedAt)}
                icon={<CalendarDays className="size-3.5" />}
              />
            </dl>
          </CardContent>
        </BorrowerCard>
      ))}
    </div>
  );
}

function FilterSelect({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 w-full rounded-xl bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="border-border/80 bg-background">
      {label}
    </Badge>
  );
}

function normalizeAmountFilter(value: string | null): AmountFilter {
  return value && value in amountFilterLabels ? (value as AmountFilter) : "any";
}

function normalizeOfferStatusFilter(value: string | null): OfferStatusFilter {
  return value && value in offerStatusFilterLabels
    ? (value as OfferStatusFilter)
    : "all";
}

function normalizeSortOption(value: string | null): SortOption {
  return value && value in sortLabels ? (value as SortOption) : "newest";
}

function matchesAmountFilter(amount: number | null | undefined, filter: AmountFilter) {
  const value = amount ?? 0;

  switch (filter) {
    case "below_5000":
      return value < 5_000;
    case "5000_10000":
      return value >= 5_000 && value <= 10_000;
    case "10000_25000":
      return value > 10_000 && value <= 25_000;
    case "above_25000":
      return value > 25_000;
    default:
      return true;
  }
}

function matchesOfferStatusFilter(
  application: LenderApplicationReview,
  filter: OfferStatusFilter,
) {
  switch (filter) {
    case "no_offer":
      return application.currentLenderOfferState === "not_offered";
    case "offer_sent":
      return application.currentLenderOfferState === "offer_pending";
    case "reviewed":
      return application.currentLenderOfferState !== "not_offered";
    default:
      return true;
  }
}

function compareApplications(
  a: LenderApplicationReview,
  b: LenderApplicationReview,
  sort: SortOption,
) {
  switch (sort) {
    case "oldest":
      return dateValue(a.submittedAt) - dateValue(b.submittedAt);
    case "amount_asc":
      return a.requestedAmount - b.requestedAmount;
    case "amount_desc":
      return b.requestedAmount - a.requestedAmount;
    case "term_asc":
      return getTermMonths(a) - getTermMonths(b);
    case "net_revenue_desc":
      return (
        b.financialIndicators.estimatedNetMonthlyRevenue -
        a.financialIndicators.estimatedNetMonthlyRevenue
      );
    default:
      return dateValue(b.submittedAt) - dateValue(a.submittedAt);
  }
}

function formatPreferredTerm(term: LenderApplicationReview["preferredTerm"]) {
  return preferredTermLabels[term];
}

function formatTermMonths(months: number) {
  return months === 1 ? "1 month" : `${months} months`;
}

function isApplicationActionableForOffer(
  application: Pick<
    LenderApplicationReview,
    "status" | "currentLenderOfferState" | "hasAcceptedOffer"
  >,
) {
  return (
    actionableApplicationStatuses.includes(
      application.status as (typeof actionableApplicationStatuses)[number],
    ) &&
    !application.hasAcceptedOffer &&
    application.currentLenderOfferState !== "offer_pending" &&
    application.currentLenderOfferState !== "offer_accepted"
  );
}

function dateValue(value: string | null | undefined) {
  const timestamp = value ? new Date(value).getTime() : 0;

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getBorrowerName(application: LenderApplicationReview) {
  const snapshot = application.borrowerProfileSnapshot;

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return "";
  }

  const profile = snapshot as Record<string, unknown>;
  const possibleNames = [
    profile.full_name,
    profile.fullName,
    profile.name,
    profile.borrower_name,
    profile.borrowerName,
  ];

  return possibleNames.find((value) => typeof value === "string") ?? "";
}

function getTermMonths(application: LenderApplicationReview) {
  const match = application.preferredTerm.match(/^(\d+)_month/);

  return match ? Number(match[1]) : 0;
}

function normalizeSearchText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildSearchText(application: LenderApplicationReview) {
  const profile = getProfileSnapshot(application);
  const locationFields = [
    profile?.business_address,
    profile?.barangay,
    profile?.city_or_municipality,
    profile?.province,
    profile?.region,
    profile?.zip_code,
  ];
  const amountText = [
    String(application.requestedAmount),
    formatCurrency(application.requestedAmount),
    `PHP ${formatCurrency(application.requestedAmount)}`,
  ];

  return [
    getBusinessName(application),
    application.portfolio.businessTypeLabel,
    getBorrowerName(application),
    application.purpose,
    application.portfolio.loanPurposeContext,
    application.portfolio.location,
    ...locationFields,
    ...amountText,
    formatPreferredTerm(application.preferredTerm),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getBusinessName(application: LenderApplicationReview) {
  const profile = getProfileSnapshot(application);
  const possibleNames = [
    profile?.business_name,
    profile?.businessName,
    profile?.trade_name,
    profile?.tradeName,
  ];

  return possibleNames.find((value) => typeof value === "string") ?? "";
}

function getProfileSnapshot(application: LenderApplicationReview) {
  const snapshot = application.borrowerProfileSnapshot;

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  return snapshot as Record<string, unknown>;
}

function serializeSearchParams(params: URLSearchParams) {
  return [...params.entries()]
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}

const offerStateLabels: Record<
  LenderApplicationReview["currentLenderOfferState"],
  string
> = {
  not_offered: "No offer yet",
  offer_pending: "Offer pending",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  offer_expired: "Offer expired",
};

export function LenderApplicationsStatus({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 text-sm leading-6",
        tone === "error"
          ? "border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E]"
          : "border-border/90 bg-card/80 text-foreground",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        {label}
      </dt>
      <dd className="mt-1 min-w-0 truncate font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatYears(value: number) {
  if (value === 1) {
    return "1 year";
  }

  return `${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 1,
  }).format(value)} years`;
}

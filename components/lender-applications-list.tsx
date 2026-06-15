import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  WalletCards,
} from "lucide-react";
import {
  formatPreferredTerm,
  isApplicationActionableForOffer,
  type LenderApplicationReview,
} from "@/lib/lender-applications";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BorrowerCard } from "@/components/borrower/ui";
import { ToneBadge } from "@/components/borrower-status-badge";
import { cn } from "@/lib/utils";

type LenderApplicationsListProps = {
  applications: LenderApplicationReview[];
  emptyDescription?: string;
  emptyTitle?: string;
};

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
    <div className="grid gap-3">
      {applications.map((application) => (
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

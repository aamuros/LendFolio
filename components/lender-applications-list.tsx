import Link from "next/link";
import {
  formatPreferredTerm,
  type LenderApplicationReview,
} from "@/lib/lender-applications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/borrower-status-badge";
import { cn } from "@/lib/utils";

type LenderApplicationsListProps = {
  applications: LenderApplicationReview[];
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
}: LenderApplicationsListProps) {
  if (applications.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed border-border/50">
        <CardContent className="grid gap-2 p-5 text-center">
          <p className="text-lg font-semibold">No open applications</p>
          <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
            New borrower applications will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {applications.map((application) => (
        <Card
          key={application.id}
          className="rounded-2xl border-border/50 shadow-sm"
        >
          <CardContent className="grid gap-3 p-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {application.portfolio.businessTypeLabel}
                </h2>
                <ToneBadge tone={applicationStatusTone(application.status)}>
                  {application.status}
                </ToneBadge>
                <ToneBadge tone={offerStateTone(application.currentLenderOfferState)}>
                  {offerStateLabels[application.currentLenderOfferState]}
                </ToneBadge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {application.portfolio.location}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <SummaryItem
                label="Requested"
                value={`PHP ${formatCurrency(application.requestedAmount)}`}
              />
              <SummaryItem
                label="Term"
                value={formatPreferredTerm(application.preferredTerm)}
              />
              <SummaryItem
                label="Net revenue"
                value={`PHP ${formatCurrency(application.financialIndicators.estimatedNetMonthlyRevenue)}`}
              />
              <SummaryItem
                label="Submitted"
                value={formatDate(application.submittedAt)}
              />
            </dl>

            <div className="flex justify-end">
              <Button
                asChild
                className="h-11 rounded-full font-semibold"
              >
                <Link href={`/lender/applications/${application.id}`}>
                  {application.currentLenderOfferState === "not_offered"
                    ? "Review"
                    : "View"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted/30 text-foreground",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-foreground">
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

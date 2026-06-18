"use client";

import { ArrowRight } from "lucide-react";
import type { LoanOfferSummary } from "@/lib/loan-offer";
import { formatCurrency, formatDate } from "@/lib/lender-format";
import { formatDateOnly } from "@/lib/manager-date-format";
import { ToneBadge } from "@/components/borrower-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LenderOfferHistoryProps = {
  offers: LoanOfferSummary[];
  compact?: boolean;
  emptyDescription?: string;
  emptyTitle?: string;
};

export function LenderOfferHistory({
  offers,
  compact = false,
  emptyDescription = "Sent offers for this application will appear here.",
  emptyTitle = "No previous offers yet.",
}: LenderOfferHistoryProps) {
  if (compact) {
    return (
      <section className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Offer history</h3>
        {offers.length > 0 ? (
          <div className="grid gap-2">
            {offers.map((offer) => (
              <OfferHistoryRow key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-background/60 p-3 text-sm leading-6">
            <p className="font-semibold text-foreground">{emptyTitle}</p>
            <p className="mt-0.5 text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={cn("grid gap-3", compact && "gap-2")}>
      <h3 className={cn("font-semibold", compact ? "text-sm" : "text-lg")}>
        Offer history
      </h3>
      {offers.length > 0 ? (
        <div className={cn("grid gap-3", compact && "gap-2")}>
          {offers.map((offer) => (
            <Card
              key={offer.id}
              className={cn(
                "rounded-xl border-border/60 shadow-none",
                offer.status !== "pending" && "opacity-75",
              )}
            >
              <CardContent className={cn("grid gap-4 p-4", compact && "gap-3 p-3")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Approved
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-semibold",
                        compact ? "text-lg" : "text-2xl",
                      )}
                    >
                      PHP {formatCurrency(offer.approvedAmount)}
                    </p>
                  </div>
                  <OfferHistoryBadge status={offer.status} />
                </div>
                <dl
                  className={cn(
                    "grid grid-cols-2 gap-3 text-sm",
                    compact ? "sm:grid-cols-2" : "sm:grid-cols-4",
                  )}
                >
                  <ReviewItem
                    label="Interest/service charge"
                    value={`PHP ${formatCurrency(offer.interestAmount)}`}
                  />
                  <ReviewItem
                    label="Fees"
                    value={`PHP ${formatCurrency(offer.fees)}`}
                  />
                  <ReviewItem
                    label="Total repayment"
                    value={`PHP ${formatCurrency(offer.totalRepaymentAmount)}`}
                  />
                  <ReviewItem
                    label="Final repayment"
                    value={formatDateOnly(offer.dueDate)}
                  />
                  <ReviewItem label="Sent" value={formatDate(offer.sentAt)} />
                </dl>
                {offer.remarks ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {offer.remarks}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-xl border-dashed border-border/60 shadow-none">
          <CardContent className="p-4 text-sm leading-6 text-muted-foreground">
            No offers have been sent for this application yet.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function OfferHistoryRow({ offer }: { offer: LoanOfferSummary }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "grid w-full gap-2 rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center",
            offer.status !== "pending" && "opacity-80",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <OfferHistoryBadge status={offer.status} />
          </span>
          <span className="min-w-0 text-sm">
            <span className="font-semibold tabular-nums">
              PHP {formatCurrency(offer.approvedAmount)}
            </span>{" "}
            <span className="text-muted-foreground">approved</span>
          </span>
          <span className="min-w-0 text-sm">
            <span className="font-semibold tabular-nums">
              PHP {formatCurrency(offer.totalRepaymentAmount)}
            </span>{" "}
            <span className="text-muted-foreground">total</span>
          </span>
          <span className="flex items-center justify-between gap-3 text-sm font-semibold text-accent-foreground sm:justify-end">
            <span className="text-xs font-medium text-muted-foreground">
              {formatDate(offer.sentAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              View
              <ArrowRight className="size-3.5" />
            </span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Offer details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <span className="text-sm font-semibold">Status</span>
            <OfferHistoryBadge status={offer.status} />
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <ReviewItem
              label="Approved amount"
              value={`PHP ${formatCurrency(offer.approvedAmount)}`}
            />
            <ReviewItem
              label="Interest/service charge"
              value={`PHP ${formatCurrency(offer.interestAmount)}`}
            />
            <ReviewItem
              label="Other borrower-paid fees"
              value={`PHP ${formatCurrency(offer.fees)}`}
            />
            <ReviewItem
              label="Total repayment"
              value={`PHP ${formatCurrency(offer.totalRepaymentAmount)}`}
            />
            <ReviewItem
              label="Final repayment"
              value={formatDateOnly(offer.dueDate)}
            />
            <ReviewItem label="Sent" value={formatDate(offer.sentAt)} />
          </dl>
          {offer.remarks ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Remarks
              </p>
              <p className="mt-1 text-sm leading-6">{offer.remarks}</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OfferHistoryBadge({ status }: { status: string }) {
  const tone =
    status === "pending"
      ? "attention"
      : status === "accepted"
        ? "success"
        : status === "declined"
          ? "danger"
          : "neutral";

  return <ToneBadge tone={tone}>{status}</ToneBadge>;
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

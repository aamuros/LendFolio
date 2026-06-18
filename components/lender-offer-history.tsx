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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LenderOfferHistoryProps = {
  offers: LoanOfferSummary[];
  compact?: boolean;
  currentLenderOfferId?: string | null;
  currentLenderId?: string | null;
  emptyDescription?: string;
  emptyTitle?: string;
};

export function LenderOfferHistory({
  offers,
  compact = false,
  currentLenderOfferId = null,
  currentLenderId = null,
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
              <OfferHistoryRow
                key={offer.id}
                offer={offer}
                isCurrentLenderOffer={
                  currentLenderId
                    ? offer.lenderId === currentLenderId
                    : offer.id === currentLenderOfferId
                }
              />
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

function OfferHistoryRow({
  offer,
  isCurrentLenderOffer,
}: {
  offer: LoanOfferSummary;
  isCurrentLenderOffer: boolean;
}) {
  const lenderName = offer.lenderName?.trim() || "Another lender";
  const lenderLabel = isCurrentLenderOffer ? `You · ${lenderName}` : lenderName;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "grid h-auto w-full whitespace-normal rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-background sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
            offer.status !== "pending" && "opacity-80",
          )}
        >
          <span className="grid min-w-0 gap-2">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="min-w-0 truncate text-sm font-semibold">
                {lenderLabel}
              </span>
              <OfferHistoryBadge status={offer.status} />
            </span>

            <span className="mt-1 grid min-w-0 gap-2 text-sm sm:grid-cols-3">
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-muted-foreground">
                  Approved
                </span>
                <span className="block truncate font-semibold tabular-nums">
                  PHP {formatCurrency(offer.approvedAmount)}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-muted-foreground">
                  Total
                </span>
                <span className="block truncate font-semibold tabular-nums">
                  PHP {formatCurrency(offer.totalRepaymentAmount)}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-muted-foreground">
                  Sent
                </span>
                <span className="block truncate font-semibold">
                  {formatDate(offer.sentAt)}
                </span>
              </span>
            </span>
          </span>

          <span className="mt-3 inline-flex items-center justify-between gap-2 text-sm font-semibold text-accent-foreground sm:mt-0 sm:justify-self-end">
            <span>View</span>
            <ArrowRight className="size-3.5" />
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Offer details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="grid gap-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Lender
              </span>
              <span className="text-sm font-semibold">{lenderLabel}</span>
            </div>
            <div className="grid justify-items-end gap-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Status
              </span>
              <OfferHistoryBadge status={offer.status} />
            </div>
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

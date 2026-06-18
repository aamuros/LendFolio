import type { LoanOfferSummary } from "@/lib/loan-offer";
import { formatCurrency, formatDate } from "@/lib/lender-format";
import { formatDateOnly } from "@/lib/manager-date-format";
import { ToneBadge } from "@/components/borrower-status-badge";
import { Card, CardContent } from "@/components/ui/card";
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
              <div
                key={offer.id}
                className={cn(
                  "grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-3",
                  offer.status !== "pending" && "opacity-75",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Approved
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      PHP {formatCurrency(offer.approvedAmount)}
                    </p>
                  </div>
                  <OfferHistoryBadge status={offer.status} />
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
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
              </div>
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

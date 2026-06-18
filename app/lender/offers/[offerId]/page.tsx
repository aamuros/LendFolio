import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { LenderPageHeader } from "@/components/lender-page-header";
import { MiniMetric, getOfferContext } from "@/components/lender-loan-details";
import { LenderApplicationsStatus } from "@/components/lender-applications-list";
import { ToneBadge } from "@/components/borrower-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { borrowerPageBottomPadding } from "@/components/borrower/ui";
import { requireApprovedLender } from "@/lib/access-control";
import { loadLenderOffers, type LenderOfferReview } from "@/lib/lender-applications";
import { formatCurrency, formatDate } from "@/lib/lender-format";
import { formatDateOnly } from "@/lib/manager-date-format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LenderOfferDetailPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const access = await requireApprovedLender();

  if (!access.ok) {
    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderPageHeader activeTab="offers" />
        <div className="mx-auto w-full max-w-7xl">
          <div className={cn("px-4 pt-3 sm:px-6 sm:pt-5", borrowerPageBottomPadding)}>
            <LenderApplicationsStatus message={access.message} tone="error" />
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab="offers" />
          </div>
        </div>
      </main>
    );
  }

  const offersResult = await loadLenderOffers(access);
  const offer = offersResult.ok
    ? offersResult.offers.find((item) => item.id === offerId)
    : null;

  return (
    <main className="theme-lendfolio min-h-svh bg-background text-foreground">
      <LenderPageHeader activeTab="offers" />
      <div className="mx-auto w-full max-w-7xl">
        <div className={cn("px-4 pt-3 sm:px-6 sm:pt-5", borrowerPageBottomPadding)}>
          {!offersResult.ok ? (
            <LenderApplicationsStatus message={offersResult.message} tone="error" />
          ) : offer ? (
            <OfferDetail offer={offer} />
          ) : (
            <UnavailableOfferState />
          )}
        </div>
        <div className="sm:hidden">
          <LenderBottomTabs activeTab="offers" />
        </div>
      </div>
    </main>
  );
}

function OfferDetail({ offer }: { offer: LenderOfferReview }) {
  const title = offer.application ? getOfferContext(offer) : "Offer details";
  const purpose = offer.application?.purpose ?? "Application context unavailable";
  const hasRepaymentChannel =
    offer.repaymentChannel ||
    offer.repaymentAccountName ||
    offer.repaymentAccountNumber ||
    offer.repaymentInstructions;

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <Button asChild variant="ghost" className="h-auto w-fit px-0 text-sm font-semibold">
            <Link href={getOfferBackHref(offer.status)}>
              <ArrowLeft className="size-4" />
              Back to offers
            </Link>
          </Button>
          <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{purpose}</p>
        </div>
        <OfferStatusBadge status={offer.status} />
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardContent className="grid gap-4 p-4 sm:p-5">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <MiniMetric
              label="Approved"
              value={`PHP ${formatCurrency(offer.approvedAmount)}`}
            />
            <MiniMetric
              label="Interest/service charge"
              value={`PHP ${formatCurrency(offer.interestAmount)}`}
            />
            <MiniMetric
              label="Fees"
              value={`PHP ${formatCurrency(offer.fees)}`}
            />
            <MiniMetric
              label="Total repayment"
              value={`PHP ${formatCurrency(offer.totalRepaymentAmount)}`}
            />
            <MiniMetric label="Due" value={formatDateOnly(offer.dueDate)} />
            <MiniMetric label="Sent" value={formatDate(offer.sentAt)} />
            {offer.application ? (
              <MiniMetric label="Submitted" value={formatDate(offer.application.submittedAt)} />
            ) : null}
          </dl>

          {hasRepaymentChannel ? (
            <>
              <Separator />
              <div className="grid gap-3">
                <p className="text-sm font-semibold">Repayment channel</p>
                <dl className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm sm:grid-cols-2">
                  {offer.repaymentChannel ? (
                    <MiniMetric label="Channel" value={offer.repaymentChannel} />
                  ) : null}
                  {offer.repaymentAccountName ? (
                    <MiniMetric label="Account name" value={offer.repaymentAccountName} />
                  ) : null}
                  {offer.repaymentAccountNumber ? (
                    <MiniMetric label="Account number" value={offer.repaymentAccountNumber} />
                  ) : null}
                  {offer.repaymentInstructions ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-muted-foreground">
                        Instructions
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">
                        {offer.repaymentInstructions}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </>
          ) : null}

          {offer.remarks ? (
            <>
              <Separator />
              <div className="grid gap-1">
                <p className="text-sm font-semibold">Remarks</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {offer.remarks}
                </p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function UnavailableOfferState() {
  return (
    <Card className="rounded-2xl border-dashed border-border/50">
      <CardContent className="grid gap-4 p-5 text-center">
        <div className="grid gap-2">
          <p className="text-lg font-semibold">Offer could not load</p>
          <p className="text-sm text-muted-foreground">This offer is not available.</p>
        </div>
        <Button asChild variant="outline" className="mx-auto h-10 rounded-xl">
          <Link href="/lender?tab=offers">
            <ArrowLeft className="size-4" />
            Back to offers
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function OfferStatusBadge({ status }: { status: string }) {
  const tone =
    status === "accepted"
      ? "success"
      : status === "declined"
        ? "danger"
        : status === "pending"
          ? "attention"
          : "neutral";

  return <ToneBadge tone={tone}>{status}</ToneBadge>;
}

function getOfferBackHref(status: string) {
  if (status === "declined") {
    return "/lender?tab=offers&offerStatus=declined";
  }

  if (status === "accepted") {
    return "/lender?tab=offers&offerStatus=accepted";
  }

  if (status === "expired") {
    return "/lender?tab=offers&offerStatus=expired";
  }

  return "/lender?tab=offers";
}

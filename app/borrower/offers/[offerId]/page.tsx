import Link from "next/link";
import { notFound } from "next/navigation";
import { loadBorrowerLoanApplications } from "@/app/borrower/actions";
import { BorrowerOfferActions } from "@/components/borrower/offers/borrower-offer-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SummaryItem } from "@/components/borrower/ui";
import { getBorrowerAccess } from "@/lib/borrower-access";
import {
  getLoanPurposeLabel,
  type LoanApplicationSummary,
} from "@/lib/loan-application";
import type { LoanOfferSummary } from "@/lib/loan-offer";
import type { Database } from "@/lib/supabase/types";
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function BorrowerOfferDetailsPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const access = await getBorrowerAccess();

  if (!access.ok) {
    return (
      <main className="theme-lendfolio min-h-svh bg-background px-4 py-6 text-foreground sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{access.message}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  const applicationsResult = await loadBorrowerLoanApplications(access);

  if (!applicationsResult.ok) {
    return (
      <main className="theme-lendfolio min-h-svh bg-background px-4 py-6 text-foreground sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{applicationsResult.message}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  let selected:
    | {
        application: LoanApplicationSummary;
        offer: LoanOfferSummary;
      }
    | null = null;

  for (const application of applicationsResult.applications) {
    const offer = application.offers.find((item) => item.id === offerId);

    if (offer) {
      selected = { application, offer };
      break;
    }
  }

  if (!selected) {
    notFound();
  }

  const { application, offer } = selected;
  const creditSnapshot = await loadLatestCreditSnapshot(
    access.supabase,
    application.id,
  );
  const isOverCurrentLimit =
    creditSnapshot.ok && offer.principalAmount > creditSnapshot.availableCredit;

  return (
    <main className="theme-lendfolio min-h-svh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-4xl gap-4">
        <Button
          asChild
          variant="ghost"
          className="h-9 w-fit px-0 font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <Link href="/borrower?tab=offers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to offers
          </Link>
        </Button>

        <Card className="rounded-xl">
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{offer.lenderName}</CardTitle>
              <Badge variant={offer.status === "pending" ? "secondary" : "outline"}>
                {formatStatus(offer.status)}
              </Badge>
            </div>
            <CardDescription>
              {getLoanPurposeLabel(application.purpose)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <SummaryItem
                label="Approved principal"
                value={formatMoney(offer.principalAmount)}
              />
              <SummaryItem
                label="Interest/service charge rate"
                value={
                  offer.interestServiceChargeRate !== null
                    ? formatPercent(offer.interestServiceChargeRate)
                    : "Not stated"
                }
              />
              <SummaryItem
                label="Interest/service charge"
                value={formatMoney(offer.interestAmount)}
              />
              <SummaryItem label="Other fees" value={formatMoney(offer.fees)} />
              <SummaryItem
                label="System processing fee"
                value={formatMoney(offer.processingFee)}
              />
              <SummaryItem
                label="Total repayment"
                value={formatMoney(offer.totalRepaymentAmount)}
              />
              <SummaryItem
                label="Final repayment date"
                value={formatDateOnly(offer.dueDate)}
              />
              <SummaryItem label="Sent" value={formatDate(offer.sentAt)} />
              <SummaryItem label="Remarks" value={offer.remarks || "None"} />
            </dl>

            <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-semibold">Repayment destination</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <SummaryItem
                  label="Channel"
                  value={offer.repaymentChannel || "Not provided"}
                />
                <SummaryItem
                  label="Account name"
                  value={offer.repaymentAccountName || "Not provided"}
                />
                <SummaryItem
                  label="Account number"
                  value={offer.repaymentAccountNumber || "Not provided"}
                />
                <SummaryItem
                  label="Instructions"
                  value={offer.repaymentInstructions || "None"}
                />
              </dl>
            </div>

            {offer.status !== "pending" ? (
              <Alert>
                <AlertDescription>
                  This offer is {formatStatus(offer.status).toLowerCase()}.
                  Actions are no longer available.
                </AlertDescription>
              </Alert>
            ) : null}

            {offer.status === "pending" && !creditSnapshot.ok ? (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{creditSnapshot.message}</AlertDescription>
              </Alert>
            ) : null}

            {offer.status === "pending" && isOverCurrentLimit ? (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Accepting this offer would exceed your credit limit. The
                  approved principal of {formatMoney(offer.principalAmount)}{" "}
                  exceeds your available credit of{" "}
                  {formatMoney(creditSnapshot.availableCredit)}.
                </AlertDescription>
              </Alert>
            ) : null}

            <BorrowerOfferActions
              offerId={offer.id}
              status={offer.status}
              creditSnapshotStatus={creditSnapshot.ok ? "ready" : "error"}
              isOverCurrentLimit={isOverCurrentLimit}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

type BorrowerCreditSnapshot =
  | {
      ok: true;
      currentCreditLimit: number;
      activePrincipalUsed: number;
      availableCredit: number;
    }
  | {
      ok: false;
      message: string;
    };

async function loadLatestCreditSnapshot(
  supabase: SupabaseClient<Database>,
  applicationId: string,
): Promise<BorrowerCreditSnapshot> {
  const { data, error } = await supabase.rpc("get_my_borrower_credit_snapshot", {
    p_excluded_application_id: applicationId,
  });

  const snapshot = data as
    | {
        ok?: boolean;
        message?: string;
        current_credit_limit?: number | string;
        active_principal_used?: number | string;
        available_credit?: number | string;
      }
    | null;

  if (error || !snapshot?.ok) {
    return {
      ok: false,
      message:
        snapshot?.message ??
        "Unable to verify your latest credit limit. Please refresh and try again.",
    };
  }

  return {
    ok: true,
    currentCreditLimit: Number(snapshot.current_credit_limit ?? 0),
    activePrincipalUsed: Number(snapshot.active_principal_used ?? 0),
    availableCredit: Number(snapshot.available_credit ?? 0),
  };
}

function formatMoney(value: number) {
  return `PHP ${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function formatStatus(status: string) {
  if (status === "accepted") {
    return "Accepted";
  }

  if (status === "declined") {
    return "Declined";
  }

  if (status === "expired") {
    return "Expired";
  }

  if (status === "pending") {
    return "Pending";
  }

  return status;
}

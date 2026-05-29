"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatCreditAmount,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";

type CreditSummaryProps = {
  summary: BorrowerCreditSummary;
};

export function CompactCreditStatusCard({ summary }: CreditSummaryProps) {
  return (
    <Card className="rounded-3xl shadow-sm border-border bg-card">
      <CardContent className="grid gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-muted-foreground">
              Available to request
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              {formatCreditAmount(summary.availableCredit)}
            </p>
          </div>
        </div>
        <CreditSecondaryLine summary={summary} />
        <CreditUsageProgress summary={summary} />
      </CardContent>
    </Card>
  );
}

export function CreditEligibilityBanner({ summary }: CreditSummaryProps) {
  return (
    <Card className="rounded-2xl border-border bg-muted/40 shadow-none">
      <CardContent className="grid gap-1 p-4">
        <p className="text-sm font-semibold text-muted-foreground">
          You can request up to
        </p>
        <p className="text-2xl font-semibold tabular-nums">
          {formatCreditAmount(summary.availableCredit)}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Based on your current credit profile.
        </p>
      </CardContent>
    </Card>
  );
}

export function CreditProfileSection({
  onUpdateProfile,
  summary,
}: CreditSummaryProps & {
  onUpdateProfile?: () => void;
}) {
  return (
    <Card className="rounded-3xl shadow-sm border-border bg-card">
      <CardHeader className="p-5 pb-0">
        <CardTitle className="text-lg">Credit profile</CardTitle>
        <CardDescription>
          Based on your saved business profile and active loan balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 pt-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-muted-foreground">
            Available to request
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatCreditAmount(summary.availableCredit)}
          </p>
        </div>

        <div className="grid gap-3">
          <CreditSecondaryLine summary={summary} />
          <CreditUsageProgress summary={summary} />
        </div>

        <Button
          variant="outline"
          onClick={onUpdateProfile}
          className="h-11 w-full rounded-full font-semibold sm:w-fit"
        >
          Update business profile
        </Button>
      </CardContent>
    </Card>
  );
}

function CreditSecondaryLine({ summary }: CreditSummaryProps) {
  return (
    <p className="text-sm leading-6 text-muted-foreground">
      Limit {formatCreditAmount(summary.calculatedCreditLimit)} · Used{" "}
      {formatCreditAmount(summary.usedCredit)}
    </p>
  );
}

function CreditUsageProgress({ summary }: CreditSummaryProps) {
  const usedPercent =
    summary.calculatedCreditLimit > 0
      ? Math.min(
          Math.round((summary.usedCredit / summary.calculatedCreditLimit) * 100),
          100,
        )
      : 0;

  return (
    <div className="grid gap-2">
      <div
        aria-label={`Used ${formatCreditAmount(summary.usedCredit)} of ${formatCreditAmount(summary.calculatedCreditLimit)} credit limit.`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={usedPercent}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${usedPercent}%` }}
        />
      </div>
      <p className="sr-only">
        {formatCreditAmount(summary.usedCredit)} used from{" "}
        {formatCreditAmount(summary.calculatedCreditLimit)} credit limit.
      </p>
    </div>
  );
}

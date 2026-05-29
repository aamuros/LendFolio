import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProfileSummaryRow } from "./profile-summary-row";
import {
  formatCreditAmount,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
import { type BorrowerPortfolioInput } from "@/lib/borrower-portfolio";
import { type BorrowerReadinessResult } from "@/lib/borrower-readiness";

export function BorrowingPowerDetail({
  creditSummary,
  onUpdateProfile,
  portfolio,
  readiness,
}: {
  creditSummary: BorrowerCreditSummary | null;
  onUpdateProfile: () => void;
  portfolio: BorrowerPortfolioInput | null;
  readiness: BorrowerReadinessResult | null;
}) {
  function formatReadinessStatus(value: string) {
    return value
      .split("_")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" ");
  }

  return (
    <Card className="rounded-2xl shadow-sm border-border bg-card">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Available to request
        </CardDescription>
        <CardTitle className="text-3xl font-bold tabular-nums">
          {creditSummary
            ? formatCreditAmount(creditSummary.availableCredit)
            : "Not available"}
        </CardTitle>
        <CardDescription className="text-xs leading-5">
          Based on your saved financials and any active loan balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-4 pt-0 pb-4">
        <div>
          <ProfileSummaryRow
            label="Used credit"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.usedCredit)
                : "Not available"
            }
          />
          <ProfileSummaryRow
            label="Max eligible amount"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.calculatedCreditLimit)
                : "Not available"
            }
          />
          <ProfileSummaryRow
            label="Monthly revenue"
            value={
              portfolio
                ? formatCreditAmount(portfolio.monthlyGrossRevenue)
                : "Not provided"
            }
          />
          <ProfileSummaryRow
            label="Monthly expenses"
            value={
              portfolio
                ? formatCreditAmount(portfolio.monthlyExpenses)
                : "Not provided"
            }
          />
          <ProfileSummaryRow
            label="Existing loan payments"
            value={
              portfolio
                ? formatCreditAmount(portfolio.existingLoanPayments)
                : "Not provided"
            }
          />
          <ProfileSummaryRow
            label="Net monthly cash flow"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.monthlyNetCashFlow)
                : readiness
                  ? formatCreditAmount(readiness.monthlyNetCashFlow)
                  : "Not available"
            }
          />
          <ProfileSummaryRow
            label="Readiness"
            value={
              readiness
                ? formatReadinessStatus(readiness.readinessStatus)
                : "Not available"
            }
          />
        </div>

        <p className="rounded-xl bg-muted/40 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          LendFolio estimates borrowing power from net monthly cash flow, time in
          operation, revenue limits, and existing active loans. Updating your
          profile refreshes this amount.
        </p>

        <Button
          variant="outline"
          onClick={onUpdateProfile}
          className="h-10 w-full rounded-full font-semibold text-sm"
        >
          Update profile details
        </Button>
      </CardContent>
    </Card>
  );
}

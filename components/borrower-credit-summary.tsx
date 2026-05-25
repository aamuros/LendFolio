"use client";

import {
  formatCreditAmount,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";

type CreditSummaryProps = {
  summary: BorrowerCreditSummary;
};

export function CompactCreditStatusCard({ summary }: CreditSummaryProps) {
  return (
    <section className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Available to request
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatCreditAmount(summary.availableCredit)}
          </p>
        </div>
      </div>
      <CreditSecondaryLine summary={summary} />
      <CreditUsageProgress summary={summary} />
    </section>
  );
}

export function CreditEligibilityBanner({ summary }: CreditSummaryProps) {
  return (
    <section className="grid gap-1 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3">
      <p className="text-sm font-semibold text-[var(--muted-foreground)]">
        You can request up to
      </p>
      <p className="text-2xl font-semibold tabular-nums">
        {formatCreditAmount(summary.availableCredit)}
      </p>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
        Based on your current credit profile.
      </p>
    </section>
  );
}

export function CreditProfileSection({
  onUpdateProfile,
  summary,
}: CreditSummaryProps & {
  onUpdateProfile?: () => void;
}) {
  return (
    <section className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
      <div className="grid gap-1">
        <h3 className="text-lg font-semibold">Credit profile</h3>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Based on your saved business profile and active loan balance.
        </p>
      </div>

      <div className="grid gap-1">
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
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

      <button
        type="button"
        onClick={onUpdateProfile}
        className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:w-fit"
      >
        Update business profile
      </button>
    </section>
  );
}

function CreditSecondaryLine({ summary }: CreditSummaryProps) {
  return (
    <p className="text-sm leading-6 text-[var(--muted-foreground)]">
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
        className="h-2 overflow-hidden rounded-full bg-[var(--muted)]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
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

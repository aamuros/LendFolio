import type { BorrowerLoanApplicationSummary } from "@/app/borrower/actions";
import type { LoanOfferSummary } from "@/lib/loan-offer";
import { formatCreditAmount } from "@/lib/credit-limit";

export type BorrowerAssistantOfferMatch = {
  application: BorrowerLoanApplicationSummary;
  offer: LoanOfferSummary;
};

export function getComparableOffers(input: {
  applications: BorrowerLoanApplicationSummary[];
  selectedApplicationId?: string | null;
}) {
  const selectedApplication = input.selectedApplicationId
    ? input.applications.find(
        (application) => application.id === input.selectedApplicationId,
      )
    : null;
  const sourceApplications = selectedApplication
    ? [selectedApplication]
    : input.applications;
  const pendingOffers = sourceApplications.flatMap((application) =>
    application.offers
      .filter((offer) => offer.status === "pending")
      .map((offer) => ({ application, offer })),
  );

  return rankOffers(pendingOffers);
}

export function rankOffers(matches: BorrowerAssistantOfferMatch[]) {
  return [...matches].sort((left, right) => {
    const leftRate = left.offer.interestServiceChargeRate ?? Number.MAX_VALUE;
    const rightRate = right.offer.interestServiceChargeRate ?? Number.MAX_VALUE;

    return (
      left.offer.totalRepaymentAmount - right.offer.totalRepaymentAmount ||
      leftRate - rightRate ||
      left.offer.fees - right.offer.fees ||
      Date.parse(right.offer.dueDate) - Date.parse(left.offer.dueDate)
    );
  });
}

export function answerOfferComparison(input: {
  applications: BorrowerLoanApplicationSummary[];
  selectedApplicationId?: string | null;
}) {
  const rankedOffers = getComparableOffers(input);

  if (rankedOffers.length === 0) {
    return "You do not have pending offers yet. Offers will appear here after approved lenders review your application and send one.";
  }

  const best = rankedOffers[0];
  const hasMultipleApplications =
    new Set(rankedOffers.map((match) => match.application.id)).size > 1;
  const higherPrincipalOffer = rankedOffers.find(
    (match) => match.offer.principalAmount > best.offer.principalAmount,
  );
  const comparisonLines = rankedOffers
    .slice(0, 3)
    .map((match, index) => {
      const offer = match.offer;

      return `${index + 1}. ${offer.lenderName}: ${formatCreditAmount(
        offer.principalAmount,
      )} principal, ${formatCreditAmount(
        offer.totalRepaymentAmount,
      )} total repayment, ${formatPercent(
        offer.interestServiceChargeRate,
      )} rate, ${formatCreditAmount(offer.fees)} fees, due ${formatDate(
        offer.dueDate,
      )}.`;
    })
    .join("\n");
  const crossApplicationNote = hasMultipleApplications
    ? " These offers are from different applications, so compare them against the loan need they belong to."
    : "";
  const principalNote = higherPrincipalOffer
    ? ` Note: ${higherPrincipalOffer.offer.lenderName} offers a higher principal (${formatCreditAmount(
        higherPrincipalOffer.offer.principalAmount,
      )}), but ${best.offer.lenderName} still ranks best because the total repayment cost is lower.`
    : "";

  return `${best.offer.lenderName} looks like the best pending offer because it has the lowest total repayment amount, then the strongest rate and fee combination among your available offers.${crossApplicationNote}\n\n${comparisonLines}${principalNote}`;
}

function formatPercent(value: number | null) {
  if (value === null) return "no listed";

  return `${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

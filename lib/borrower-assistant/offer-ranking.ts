import type { BorrowerLoanApplicationSummary } from "@/app/borrower/actions";
import type { LoanOfferSummary } from "@/lib/loan-offer";
import { formatCreditAmount } from "@/lib/credit-limit";
import type { BorrowerAssistantReply } from "@/lib/borrower-assistant/types";

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
  return [...matches].sort(compareOffersByCost);
}

export function answerOfferComparison(input: {
  applications: BorrowerLoanApplicationSummary[];
  selectedApplicationId?: string | null;
}): BorrowerAssistantReply {
  const rankedOffers = getComparableOffers(input);

  if (rankedOffers.length === 0) {
    const scopedApplications = getSourceApplications(input);
    const closedOfferCount = scopedApplications.reduce(
      (count, application) =>
        count +
        application.offers.filter((offer) => offer.status !== "pending").length,
      0,
    );

    return {
      content:
        closedOfferCount > 0
          ? "You do not have active offers to accept right now. Older offers may already be accepted, declined, closed, or no longer pending."
          : "You do not have pending offers yet. Offers will appear after approved lenders review your application and send one.",
      actions: [{ type: "tab", label: "View offers", tab: "offers" }],
    };
  }

  if (rankedOffers.length === 1) {
    const onlyMatch = rankedOffers[0];
    const offer = onlyMatch.offer;

    return {
      content: `You have one pending offer from ${
        offer.lenderName
      }. It offers ${formatCreditAmount(
        offer.principalAmount,
      )} principal with ${formatCreditAmount(
        offer.totalRepaymentAmount,
      )} total repayment, ${formatPercent(
        offer.interestServiceChargeRate,
      )} service charge rate, ${formatCreditAmount(
        offer.fees,
      )} fees, and a due date of ${formatDate(offer.dueDate)}. ${getCoverageText(
        onlyMatch,
      )}`,
      actions: [{ type: "tab", label: "View offers", tab: "offers" }],
    };
  }

  const recommended = rankedOffers[0];
  const tiedTopOffers = rankedOffers.filter(
    (match) => compareOffersByCost(recommended, match) === 0,
  );
  const hasMultipleApplications =
    new Set(rankedOffers.map((match) => match.application.id)).size > 1;
  const hasDifferentPrincipalAmounts =
    new Set(rankedOffers.map((match) => match.offer.principalAmount)).size > 1;
  const higherPrincipalOffer = rankedOffers.find(
    (match) => match.offer.principalAmount > recommended.offer.principalAmount,
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
      )}. ${getCoverageText(match)}`;
    })
    .join("\n");
  const crossApplicationNote = hasMultipleApplications
    ? " These offers are from different applications, so compare them against the loan need they belong to."
    : "";
  const differentPrincipalNote = hasDifferentPrincipalAmounts
    ? " The principal amounts are not the same, so the lowest total repayment is not the only thing to consider."
    : "";
  const principalNote = higherPrincipalOffer
    ? ` ${higherPrincipalOffer.offer.lenderName} offers a higher principal (${formatCreditAmount(
        higherPrincipalOffer.offer.principalAmount,
      )}); choose that only if you need the larger approved amount.`
    : "";

  if (tiedTopOffers.length > 1) {
    const tiedLenders = tiedTopOffers
      .map((match) => match.offer.lenderName)
      .join(" and ");

    return {
      content: `${tiedLenders} are tied as the strongest pending offers by cost because they have the same total repayment, service charge rate, fees, and due date.${crossApplicationNote}${differentPrincipalNote} Choose based on the lender you trust more or the repayment channel that is easier for you.\n\n${comparisonLines}${principalNote}`,
      actions: [{ type: "tab", label: "View offers", tab: "offers" }],
    };
  }

  return {
    content: `${
      recommended.offer.lenderName
    } is the strongest pending offer by cost because it has the lowest total repayment after comparing service charge rate, fees, and due date convenience.${crossApplicationNote}${differentPrincipalNote}\n\n${comparisonLines}${principalNote}`,
    actions: [{ type: "tab", label: "View offers", tab: "offers" }],
  };
}

function compareOffersByCost(
  left: BorrowerAssistantOfferMatch,
  right: BorrowerAssistantOfferMatch,
) {
  const leftRate = left.offer.interestServiceChargeRate ?? Number.MAX_VALUE;
  const rightRate = right.offer.interestServiceChargeRate ?? Number.MAX_VALUE;

  return (
    left.offer.totalRepaymentAmount - right.offer.totalRepaymentAmount ||
    leftRate - rightRate ||
    left.offer.fees - right.offer.fees ||
    Date.parse(right.offer.dueDate) - Date.parse(left.offer.dueDate)
  );
}

function getSourceApplications(input: {
  applications: BorrowerLoanApplicationSummary[];
  selectedApplicationId?: string | null;
}) {
  const selectedApplication = input.selectedApplicationId
    ? input.applications.find(
        (application) => application.id === input.selectedApplicationId,
      )
    : null;

  return selectedApplication ? [selectedApplication] : input.applications;
}

function getCoverageText(match: BorrowerAssistantOfferMatch) {
  if (match.offer.principalAmount >= match.application.requestedAmount) {
    return "It covers the requested principal.";
  }

  return `It is below the requested ${formatCreditAmount(
    match.application.requestedAmount,
  )} principal.`;
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

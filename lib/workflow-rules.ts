import type {
  ApplicationStatus,
  OfferStatus,
  RepaymentProofStatus,
} from "@/lib/supabase/types";

export const openApplicationStatuses = ["submitted", "open"] as const;

export function canEditApplication(status: ApplicationStatus) {
  return openApplicationStatuses.includes(
    status as (typeof openApplicationStatuses)[number],
  );
}

export function canWithdrawApplication(status: ApplicationStatus) {
  return canEditApplication(status);
}

export function canDeclineOffer(input: {
  borrowerId: string;
  actorId: string;
  offerStatus: OfferStatus;
  applicationStatus: ApplicationStatus;
}) {
  return (
    input.borrowerId === input.actorId &&
    input.offerStatus === "pending" &&
    canEditApplication(input.applicationStatus)
  );
}

export function canAcceptOffer(input: {
  borrowerId: string;
  actorId: string;
  offerStatus: OfferStatus;
  applicationStatus: ApplicationStatus;
}) {
  return (
    input.borrowerId === input.actorId &&
    input.offerStatus === "pending" &&
    openApplicationStatuses.includes(
      input.applicationStatus as (typeof openApplicationStatuses)[number],
    )
  );
}

export function canReviewRepaymentProof(status: RepaymentProofStatus) {
  return status === "submitted";
}

export function applyAcceptedOfferInvariant<
  TOffer extends {
    id: string;
    loanApplicationId: string;
    borrowerId: string;
    status: OfferStatus;
  },
>(input: {
  actorId: string;
  selectedOfferId: string;
  applicationStatus: ApplicationStatus;
  offers: TOffer[];
}) {
  const selectedOffer = input.offers.find(
    (offer) => offer.id === input.selectedOfferId,
  );

  if (!selectedOffer) {
    return {
      ok: false as const,
      reason: "missing_offer" as const,
      offers: input.offers,
    };
  }

  if (
    !canAcceptOffer({
      actorId: input.actorId,
      borrowerId: selectedOffer.borrowerId,
      offerStatus: selectedOffer.status,
      applicationStatus: input.applicationStatus,
    })
  ) {
    return {
      ok: false as const,
      reason: "not_allowed" as const,
      offers: input.offers,
    };
  }

  return {
    ok: true as const,
    applicationStatus: "accepted" as const,
    offers: input.offers.map((offer) => {
      if (offer.id === selectedOffer.id) {
        return { ...offer, status: "accepted" as const };
      }

      if (
        offer.loanApplicationId === selectedOffer.loanApplicationId &&
        offer.status === "pending"
      ) {
        return { ...offer, status: "declined" as const };
      }

      return offer;
    }),
  };
}

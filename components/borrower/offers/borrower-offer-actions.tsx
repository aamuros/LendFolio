"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptLoanOffer,
  declineLoanOffer,
} from "@/app/borrower/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function BorrowerOfferActions({
  offerId,
  status,
}: {
  offerId: string;
  status: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isClosed = status !== "pending";

  function returnToOffers() {
    router.push("/borrower?tab=offers");
    router.refresh();
  }

  function onAccept() {
    setMessage("");
    startTransition(async () => {
      const result = await acceptLoanOffer(offerId);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      returnToOffers();
    });
  }

  function onDecline() {
    setMessage("");
    startTransition(async () => {
      const result = await declineLoanOffer(offerId);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      returnToOffers();
    });
  }

  return (
    <div className="grid gap-3">
      {message ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-2 sm:flex sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isPending || isClosed}
          onClick={onDecline}
          className="h-11 rounded-full font-semibold"
        >
          Decline
        </Button>
        <Button
          type="button"
          disabled={isPending || isClosed}
          onClick={onAccept}
          className="h-11 rounded-full font-semibold"
        >
          {status === "accepted"
            ? "Accepted"
            : status === "declined"
              ? "Closed"
              : isPending
                ? "Working..."
                : "Accept offer"}
        </Button>
      </div>
    </div>
  );
}

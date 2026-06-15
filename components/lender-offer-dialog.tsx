"use client";

import { LenderOfferForm } from "@/components/lender-offer-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LenderOfferDialogProps = {
  applicationId: string;
  requestedAmount: number;
  availableCreditAtSubmission: number | null;
  defaultDueDate: string;
  preferredTerm: string;
  preferredTermLabel: string;
};

export function LenderOfferDialog({
  applicationId,
  requestedAmount,
  availableCreditAtSubmission,
  defaultDueDate,
  preferredTerm,
  preferredTermLabel,
}: LenderOfferDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full rounded-xl sm:w-auto">Give offer</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Offer details and specifications</DialogTitle>
        </DialogHeader>
        <LenderOfferForm
          applicationId={applicationId}
          requestedAmount={requestedAmount}
          availableCreditAtSubmission={availableCreditAtSubmission}
          defaultDueDate={defaultDueDate}
          preferredTerm={preferredTerm}
          preferredTermLabel={preferredTermLabel}
        />
      </DialogContent>
    </Dialog>
  );
}

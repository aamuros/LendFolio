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
      <DialogContent className="grid max-h-[min(92svh,900px)] gap-0 overflow-hidden p-0 sm:max-w-4xl lg:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-12 sm:px-5">
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

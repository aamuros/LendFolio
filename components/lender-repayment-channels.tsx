"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import {
  addRepaymentChannel,
  removeRepaymentChannel,
} from "@/app/lender/actions";
import { StatusToast } from "@/components/status-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { RepaymentChannelSummary } from "@/lib/active-loans";

type RepaymentChannelsManagerProps = {
  activeLoanId: string;
  originalChannel: string | null;
  originalAccountName: string | null;
  originalAccountNumber: string | null;
  originalInstructions: string | null;
  additionalChannels: RepaymentChannelSummary[];
  isLoanActive: boolean;
};

const channelOptions = [
  "GCash",
  "Maya",
  "BPI",
  "BDO",
  "Metrobank",
  "UnionBank",
  "Landbank",
  "BDO Online",
  "Bank Transfer",
  "Cash",
  "Other",
];

export function RepaymentChannelsManager({
  activeLoanId,
  originalChannel,
  originalAccountName,
  originalAccountNumber,
  originalInstructions,
  additionalChannels,
  isLoanActive,
}: RepaymentChannelsManagerProps) {
  const [toastMessage, setToastMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [channel, setChannel] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const dismissToast = useCallback(() => {
    setToastMessage("");
  }, []);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addRepaymentChannel(
        activeLoanId,
        String(formData.get("channel") ?? ""),
        String(formData.get("accountName") ?? ""),
        String(formData.get("accountNumber") ?? ""),
        String(formData.get("instructions") ?? ""),
      );

      if (result.ok) {
        formRef.current?.reset();
        setChannel("");
        setShowAddForm(false);
        setToastMessage(result.message);
      } else {
        setToastMessage(result.message);
      }
    });
  }

  function handleRemove(channelId: string) {
    startTransition(async () => {
      const result = await removeRepaymentChannel(channelId);

      if (result.ok) {
        setToastMessage(result.message);
      } else {
        setToastMessage(result.message);
      }
    });
  }

  const hasOriginalChannel = Boolean(originalChannel);
  const hasAdditionalChannels = additionalChannels.length > 0;

  return (
    <div className="grid gap-3">
      <StatusToast message={toastMessage} onDismiss={dismissToast} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Repayment destinations</p>
        {isLoanActive ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-8 gap-1.5 rounded-full text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            {showAddForm ? "Cancel" : "Add channel"}
          </Button>
        ) : null}
      </div>

      {hasOriginalChannel ? (
        <Card className="rounded-xl">
          <CardContent className="grid gap-1 p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Original offer channel
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Channel</dt>
                <dd className="font-semibold">{originalChannel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account name</dt>
                <dd className="font-semibold">
                  {originalAccountName ?? ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account number</dt>
                <dd className="font-semibold">
                  {originalAccountNumber ?? ""}
                </dd>
              </div>
              {originalInstructions ? (
                <div>
                  <dt className="text-muted-foreground">Instructions</dt>
                  <dd className="font-semibold">{originalInstructions}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {hasAdditionalChannels ? (
        <div className="grid gap-2">
          {additionalChannels.map((ch) => (
            <Card key={ch.id} className="rounded-xl">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid w-full gap-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Additional channel
                    </p>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Channel</dt>
                        <dd className="font-semibold">{ch.channel}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Account name</dt>
                        <dd className="font-semibold">{ch.accountName}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Account number
                        </dt>
                        <dd className="font-semibold">{ch.accountNumber}</dd>
                      </div>
                      {ch.instructions ? (
                        <div>
                          <dt className="text-muted-foreground">
                            Instructions
                          </dt>
                          <dd className="font-semibold">{ch.instructions}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                  {isLoanActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => handleRemove(ch.id)}
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${ch.channel} channel`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!hasOriginalChannel && !hasAdditionalChannels ? (
        <p className="text-sm text-muted-foreground">
          No repayment destinations set.
        </p>
      ) : null}

      {showAddForm ? (
        <form ref={formRef} action={handleAdd} className="grid gap-3">
          <Card className="rounded-xl border-dashed">
            <CardContent className="grid gap-3 p-3">
              <p className="text-sm font-semibold">New repayment channel</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label className="grid gap-1.5">
                  <span className="text-sm font-semibold">Channel</span>
                  <input
                    type="hidden"
                    name="channel"
                    value={channel}
                  />
                  <Select
                    value={channel}
                    onValueChange={setChannel}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channelOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>
                <Label className="grid gap-1.5">
                  <span className="text-sm font-semibold">Account name</span>
                  <Input
                    name="accountName"
                    disabled={isPending}
                    placeholder="Account holder name"
                    className="h-9"
                  />
                </Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    Account / wallet number
                  </span>
                  <Input
                    name="accountNumber"
                    disabled={isPending}
                    placeholder="Account or wallet number"
                    className="h-9"
                  />
                </Label>
                <Label className="grid gap-1.5">
                  <span className="text-sm font-semibold">
                    Instructions (optional)
                  </span>
                  <Input
                    name="instructions"
                    disabled={isPending}
                    placeholder="e.g. Include loan ID in the note"
                    className="h-9"
                  />
                </Label>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isPending || !channel}
                  className="h-9 rounded-full font-semibold"
                >
                  {isPending ? "Adding..." : "Add channel"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      ) : null}
    </div>
  );
}

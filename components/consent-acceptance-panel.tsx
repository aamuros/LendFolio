"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptUserConsentsAction } from "@/app/consents/actions";
import {
  consentTypeLabels,
  type ConsentScope,
  type ConsentStatus,
} from "@/lib/consents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type ConsentAcceptancePanelProps = {
  status: ConsentStatus;
  scope: ConsentScope;
  title?: string;
  onAccepted?: () => void;
};

export function ConsentAcceptancePanel({
  status,
  scope,
  title = "Required disclosures",
  onAccepted,
}: ConsentAcceptancePanelProps) {
  const router = useRouter();
  const [isChecked, setIsChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function acceptConsents() {
    setMessage("");
    startTransition(async () => {
      const result = await acceptUserConsentsAction(scope);

      setMessage(result.message);

      if (result.ok) {
        setIsChecked(false);
        onAccepted?.();
        router.refresh();
      }
    });
  }

  return (
    <Card className="rounded-2xl bg-muted/30">
      <CardContent className="grid gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h4 className="text-sm font-semibold">{title}</h4>
            <p className="text-sm leading-6 text-muted-foreground">
              Disclosure text is managed separately. This records your acceptance of
              the current version.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold">
            {status.isCurrent ? "Current" : "Missing"}
          </Badge>
        </div>

        <Separator />

        <dl className="grid gap-2 text-sm">
          {status.required.map((consent) => {
            const accepted = status.accepted.find(
              (item) =>
                item.consentType === consent.consentType &&
                item.version === consent.version,
            );

            return (
              <div
                key={`${consent.consentType}-${consent.version}`}
                className="grid gap-1 border-t border-border pt-2 first:border-t-0 first:pt-0"
              >
                <dt className="font-semibold">{consentTypeLabels[consent.consentType]}</dt>
                <dd className="text-xs leading-5 text-muted-foreground">
                  {consent.version}
                  {accepted ? ` · Accepted ${formatDateTime(accepted.acceptedAt)}` : ""}
                </dd>
              </div>
            );
          })}
        </dl>

        {!status.isCurrent ? (
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`consent-${scope}`}
                checked={isChecked}
                onCheckedChange={(checked) => setIsChecked(checked === true)}
                className="mt-0.5"
              />
              <Label
                htmlFor={`consent-${scope}`}
                className="text-sm font-semibold leading-snug cursor-pointer"
              >
                I accept the required disclosures for this step.
              </Label>
            </div>
            <Button
              disabled={!isChecked || isPending}
              onClick={acceptConsents}
              className="w-fit rounded-full h-10 px-5 font-semibold"
            >
              {isPending ? "Accepting..." : "Accept disclosures"}
            </Button>
          </div>
        ) : null}

        {message ? (
          <p className="text-sm leading-6 text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

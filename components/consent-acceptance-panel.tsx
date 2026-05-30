"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileCheck2 } from "lucide-react";
import { acceptUserConsentsAction } from "@/app/consents/actions";
import {
  consentTypeLabels,
  type ConsentScope,
  type ConsentStatus,
} from "@/lib/consents";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type ConsentAcceptancePanelProps = {
  status: ConsentStatus;
  scope: ConsentScope;
  title?: string;
  variant?: "default" | "onboarding";
};

export function ConsentAcceptancePanel({
  status,
  scope,
  title = "Required disclosures",
  variant = "default",
}: ConsentAcceptancePanelProps) {
  if (variant === "onboarding") {
    return (
      <OnboardingConsentPanel
        status={status}
        scope={scope}
        title={title}
      />
    );
  }

  return (
    <DefaultConsentPanel
      status={status}
      scope={scope}
      title={title}
    />
  );
}

function OnboardingConsentPanel({
  status,
  scope,
  title,
}: {
  status: ConsentStatus;
  scope: ConsentScope;
  title: string;
}) {
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
        router.refresh();
      }
    });
  }

  const remainingCount = status.missing.length;

  return (
    <Card className="rounded-2xl border-border/50 bg-card">
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] font-semibold"
          >
            {status.isCurrent
              ? "All accepted"
              : `${remainingCount} remaining`}
          </Badge>
        </div>
        <CardDescription className="text-xs leading-5">
          Accept the required disclosures so a manager can complete your approval.
        </CardDescription>
      </CardHeader>

      <Separator />

      <CardContent className="grid gap-2.5">
        {status.required.map((consent) => {
          const accepted = status.accepted.find(
            (item) =>
              item.consentType === consent.consentType &&
              item.version === consent.version,
          );

          return (
            <div
              key={`${consent.consentType}-${consent.version}`}
              className="flex items-start gap-3 rounded-lg px-1 py-0.5"
            >
              {accepted ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <Checkbox
                  id={`consent-${scope}-${consent.consentType}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => setIsChecked(checked === true)}
                  className="mt-0.5"
                />
              )}
              <div className="grid gap-0.5 min-w-0">
                <Label
                  htmlFor={
                    accepted
                      ? undefined
                      : `consent-${scope}-${consent.consentType}`
                  }
                  className="text-sm font-medium leading-snug cursor-pointer"
                >
                  {consentTypeLabels[consent.consentType]}
                </Label>
                {accepted ? (
                  <p className="text-xs text-muted-foreground">
                    Accepted {formatDateTime(accepted.acceptedAt)}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}

        {message ? (
          <p className="text-xs text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </CardContent>

      {!status.isCurrent ? (
        <CardFooter>
          <Button
            disabled={!isChecked || isPending}
            onClick={acceptConsents}
            className="w-full rounded-full h-10 font-semibold sm:w-fit sm:px-5"
          >
            {isPending ? "Accepting..." : "Accept disclosures"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function DefaultConsentPanel({
  status,
  scope,
  title,
}: {
  status: ConsentStatus;
  scope: ConsentScope;
  title: string;
}) {
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
        router.refresh();
      }
    });
  }

  const remainingCount = status.missing.length;

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
            {status.isCurrent
              ? "Current"
              : `${remainingCount} remaining`}
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptUserConsentsAction } from "@/app/consents/actions";
import {
  consentTypeLabels,
  type ConsentScope,
  type ConsentStatus,
} from "@/lib/consents";

type ConsentAcceptancePanelProps = {
  status: ConsentStatus;
  scope: ConsentScope;
  title?: string;
};

export function ConsentAcceptancePanel({
  status,
  scope,
  title = "Required disclosures",
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
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Disclosure text is managed separately. This records your acceptance of
            the current version.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          {status.isCurrent ? "Current" : "Missing"}
        </span>
      </div>

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
              className="grid gap-1 border-t border-[var(--border)] pt-2 first:border-t-0 first:pt-0"
            >
              <dt className="font-semibold">{consentTypeLabels[consent.consentType]}</dt>
              <dd className="text-xs leading-5 text-[var(--muted-foreground)]">
                {consent.version}
                {accepted ? ` · Accepted ${formatDateTime(accepted.acceptedAt)}` : ""}
              </dd>
            </div>
          );
        })}
      </dl>

      {!status.isCurrent ? (
        <div className="grid gap-3">
          <label className="flex items-start gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(event) => setIsChecked(event.target.checked)}
              className="mt-1 size-4"
            />
            <span>I accept the required disclosures for this step.</span>
          </label>
          <button
            type="button"
            disabled={!isChecked || isPending}
            onClick={acceptConsents}
            className="inline-flex h-10 w-fit items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            {isPending ? "Accepting..." : "Accept disclosures"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm leading-6 text-[var(--muted-foreground)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

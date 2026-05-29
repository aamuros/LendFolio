"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

type LenderStatusTone = "attention" | "ready" | "neutral";

type DismissibleLenderStatusBannerProps = {
  title: string;
  description: string;
  pill: string;
  tone: LenderStatusTone;
  action: string | null;
  actionHref: string | null;
};

export function DismissibleLenderStatusBanner({
  title,
  description,
  pill,
  tone,
  action,
  actionHref,
}: DismissibleLenderStatusBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  const toneClassName =
    tone === "ready"
      ? "border-[#ddd0bd] bg-[#f7f1e8] text-[#241f1a]"
      : tone === "attention"
        ? "border-[#e7d6b5] bg-[#fff8e8] text-[#3a2d16]"
        : "border-[var(--border)] bg-white text-[var(--foreground)]";

  return (
    <section className={`rounded-3xl border px-5 py-5 shadow-sm ${toneClassName}`}>
      <div className="flex items-start gap-3">
        <LenderBannerStatusIcon tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <LenderBannerStatusPill tone={tone}>{pill}</LenderBannerStatusPill>
          </div>
          <p className="mt-1 text-sm leading-6 text-current/75">{description}</p>
          {action ? (
            actionHref ? (
              <Link
                href={actionHref}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-white/80 px-4 text-sm font-semibold text-current shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
              >
                {action}
              </Link>
            ) : (
              <p className="mt-3 text-sm font-semibold">{action}</p>
            )
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss status message"
          onClick={() => setIsVisible(false)}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/70 text-current transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </section>
  );
}

function LenderBannerStatusPill({
  tone,
  children,
}: {
  tone: LenderStatusTone;
  children: ReactNode;
}) {
  const className =
    tone === "ready"
      ? "border border-[#ddd0bd] bg-[#eee7dc] text-[#241f1a]"
      : tone === "attention"
        ? "bg-[#f3e5c5] text-[#3a2d16]"
        : "bg-[var(--muted)] text-[var(--muted-foreground)]";

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function LenderBannerStatusIcon({ tone }: { tone: LenderStatusTone }) {
  const className =
    tone === "ready"
      ? "bg-[#241f1a] text-[#f7f1e8]"
      : tone === "attention"
        ? "bg-[#3a2d16] text-[#fff8e8]"
        : "bg-[var(--muted)] text-[var(--muted-foreground)]";

  return (
    <span
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {tone === "ready" ? (
          <path d="m5 12 4 4L19 6" />
        ) : tone === "attention" ? (
          <>
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </>
        )}
      </svg>
    </span>
  );
}

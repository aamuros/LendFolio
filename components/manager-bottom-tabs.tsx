"use client";

import Link from "next/link";
import { useState } from "react";
import { AppBottomTabs, type AppBottomTab } from "@/components/app-bottom-tabs";

export type ManagerTab =
  | "home"
  | "lookup"
  | "loans"
  | "others"
  | "proofs"
  | "audit"
  | "applications";

type ManagerVisibleTab = "home" | "lookup" | "loans" | "others";

const tabs: AppBottomTab<ManagerVisibleTab>[] = [
  { id: "home", label: "Home", icon: "home", href: "/manager" },
  { id: "lookup", label: "Users", icon: "lookup", href: "/manager/lookup" },
  { id: "loans", label: "Loans", icon: "loans", href: "/manager/loans" },
  { id: "others", label: "Others", icon: "others" },
];

const floatingLinks = [
  { href: "/manager/audit-logs", label: "Logs", ariaLabel: "Audit logs", icon: "logs" },
  {
    href: "/manager/repayments",
    label: "Proofs",
    ariaLabel: "Repayment proofs",
    icon: "proofs",
  },
  {
    href: "/manager/applications",
    label: "Apps",
    ariaLabel: "Applications and offers",
    icon: "applications",
  },
];

export function ManagerBottomTabs({ activeTab }: { activeTab: ManagerTab | null }) {
  const [isOthersOpen, setIsOthersOpen] = useState(false);
  const visibleActiveTab =
    isOthersOpen ||
    activeTab === "proofs" ||
    activeTab === "audit" ||
    activeTab === "applications"
      ? "others"
      : activeTab;

  return (
    <AppBottomTabs
      tabs={tabs}
      activeTab={visibleActiveTab}
      ariaLabel="Manager sections"
      onTabChange={(tab) => {
        if (tab === "others") {
          setIsOthersOpen((isOpen) => !isOpen);
          return;
        }

        setIsOthersOpen(false);
      }}
      onAnyTabPress={(tab) => {
        if (tab !== "others") {
          setIsOthersOpen(false);
        }
      }}
      floatingMenu={<ManagerFloatingMenu onClose={() => setIsOthersOpen(false)} />}
      isFloatingMenuOpen={isOthersOpen}
      onFloatingMenuClose={() => setIsOthersOpen(false)}
    />
  );
}

function ManagerFloatingMenu({ onClose }: { onClose: () => void }) {
  const baseBubbleClass =
    "grid size-16 origin-bottom transform-gpu place-items-center rounded-full border border-[var(--border)] bg-white text-center text-[0.65rem] font-semibold text-[var(--foreground)] shadow-[0_14px_32px_rgba(22,22,22,0.16)] transition-all duration-300 ease-out hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-95 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:size-20 sm:text-xs";

  return (
    <div
      role="group"
      aria-label="More manager sections"
      className="relative mx-auto flex max-w-xs items-end justify-center gap-3 px-2 pb-1"
    >
      {floatingLinks.map((link, index) => {
        const positionClass =
          index === 1
            ? "-translate-y-7 scale-105 hover:-translate-y-8 hover:scale-110"
            : "translate-y-0 hover:-translate-y-1 hover:scale-105";

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.ariaLabel}
            onClick={onClose}
            className={`${baseBubbleClass} ${positionClass}`}
            style={{ transitionDelay: `${index * 45}ms` }}
          >
            <FloatingMenuIcon name={link.icon} />
            <span className="max-w-14 leading-tight">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function FloatingMenuIcon({ name }: { name: string }) {
  if (name === "logs") {
    return (
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
        <path d="M12 8v5l3 2" />
        <path d="M3.05 11a9 9 0 1 1 2.64 6.36" />
        <path d="M3 16v-5h5" />
      </svg>
    );
  }

  if (name === "proofs") {
    return (
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
        <path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1z" />
        <path d="m9 12 2 2 4-5" />
        <path d="M9 7h6" />
      </svg>
    );
  }

  return (
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
      <path d="M4 7h16" />
      <path d="M6 5h12a2 2 0 0 1 2 2v10H4V7a2 2 0 0 1 2-2Z" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
      <path d="M7 19h10" />
    </svg>
  );
}

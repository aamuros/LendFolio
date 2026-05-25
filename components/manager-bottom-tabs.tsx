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
  { href: "/manager/audit-logs", label: "Logs", icon: "logs" },
  { href: "/manager/repayments", label: "Proofs", icon: "proofs" },
  {
    href: "/manager/applications",
    label: "Applications & offers",
    icon: "applications",
  },
];

export function ManagerBottomTabs({ activeTab }: { activeTab: ManagerTab | null }) {
  const [isOthersOpen, setIsOthersOpen] = useState(false);
  const visibleActiveTab =
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
        }
      }}
      floatingMenu={<ManagerFloatingMenu onClose={() => setIsOthersOpen(false)} />}
      isFloatingMenuOpen={isOthersOpen}
      onFloatingMenuClose={() => setIsOthersOpen(false)}
    />
  );
}

function ManagerFloatingMenu({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="group"
      aria-label="More manager sections"
      className="grid grid-cols-3 gap-2 rounded-3xl border border-[var(--border)] bg-white/95 p-3 shadow-[0_18px_45px_rgba(22,22,22,0.18)] backdrop-blur"
    >
      {floatingLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onClose}
          className="grid min-h-20 place-items-center gap-1 rounded-2xl border border-[var(--border)] bg-white px-2 py-3 text-center text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:text-sm"
        >
          <FloatingMenuIcon name={link.icon} />
          <span className="leading-tight">{link.label}</span>
        </Link>
      ))}
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
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
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
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 14h6" />
        <path d="M9 18h4" />
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
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  );
}

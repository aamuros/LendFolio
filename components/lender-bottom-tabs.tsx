import Link from "next/link";
import { AppBottomTabs, type AppBottomTab } from "@/components/app-bottom-tabs";
import { NotificationButton } from "@/components/notification-button";

export type LenderTab = "home" | "applications" | "offers" | "account";

const tabs: AppBottomTab<LenderTab>[] = [
  { id: "home", label: "Home", icon: "home", href: "/lender" },
  {
    id: "applications",
    label: "Applications",
    icon: "applications",
    href: "/lender/applications",
  },
  { id: "offers", label: "Offers", icon: "offers", href: "/lender?tab=offers" },
];

export function LenderBottomTabs({ activeTab }: { activeTab: LenderTab }) {
  return (
    <AppBottomTabs
      tabs={tabs}
      activeTab={activeTab}
      ariaLabel="Lender sections"
    />
  );
}

export function LenderHeader({
  title = "LendFolio",
  showAccountLink = true,
  showNotifications = true,
  accountHref = "/lender?tab=account",
}: {
  title?: string;
  showAccountLink?: boolean;
  showNotifications?: boolean;
  accountHref?: string;
}) {
  return (
    <header className="flex min-h-10 items-center justify-between gap-4">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <div className="flex items-center gap-2">
        {showNotifications ? <NotificationButton /> : null}
        {showAccountLink ? (
          <Link
            href={accountHref}
            aria-label="Open account"
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
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
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </Link>
        ) : null}
      </div>
    </header>
  );
}

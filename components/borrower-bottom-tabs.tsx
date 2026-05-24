"use client";

type BorrowerTab = "home" | "profile" | "apply" | "offers";

type BorrowerBottomTabsProps = {
  activeTab: BorrowerTab;
  onTabChange: (tab: BorrowerTab) => void;
};

const tabs: {
  id: BorrowerTab;
  label: string;
  icon: "home" | "profile" | "apply" | "offers";
}[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "profile", label: "Profile", icon: "profile" },
  { id: "apply", label: "Apply", icon: "apply" },
  { id: "offers", label: "Offers", icon: "offers" },
];

export function BorrowerBottomTabs({
  activeTab,
  onTabChange,
}: BorrowerBottomTabsProps) {
  return (
    <nav
      aria-label="Borrower sections"
      className="fixed inset-x-0 bottom-4 z-40 px-4 sm:bottom-6"
    >
      <div className="mx-auto flex max-w-md items-center justify-between rounded-full border border-[var(--border)] bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(22,22,22,0.16)] backdrop-blur">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onTabChange(tab.id)}
              className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                isActive
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/70 hover:text-[var(--foreground)]"
              }`}
            >
              <TabIcon name={tab.icon} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TabIcon({ name }: { name: "home" | "profile" | "apply" | "offers" }) {
  if (name === "home") {
    return (
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
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
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
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 10h8" />
        <path d="M8 14h5" />
      </svg>
    );
  }

  if (name === "apply") {
    return (
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
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M12 11v6" />
        <path d="M9 14h6" />
      </svg>
    );
  }

  return (
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
      <path d="M4 7h16v12H4z" />
      <path d="M4 10h16" />
      <path d="M8 15h4" />
    </svg>
  );
}

export type { BorrowerTab };

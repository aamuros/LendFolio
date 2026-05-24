"use client";

import { AppBottomTabs, type AppBottomTab } from "@/components/app-bottom-tabs";

type BorrowerTab = "home" | "profile" | "apply" | "offers";

type BorrowerBottomTabsProps = {
  activeTab: BorrowerTab;
  onTabChange: (tab: BorrowerTab) => void;
};

const tabs: AppBottomTab<BorrowerTab>[] = [
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
    <AppBottomTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      ariaLabel="Borrower sections"
    />
  );
}

export type { BorrowerTab };

"use client";

import { AppBottomTabs, type AppBottomTab } from "@/components/app-bottom-tabs";
import { AppHeader, type AppHeaderNavItem } from "@/components/app-header";

export type LenderTab = "home" | "applications" | "offers" | "profile" | "account";

const tabs: AppBottomTab<LenderTab>[] = [
  { id: "home", label: "Home", icon: "home", href: "/lender" },
  {
    id: "applications",
    label: "Applications",
    icon: "applications",
    href: "/lender?tab=applications",
  },
  { id: "offers", label: "Offers", icon: "offers", href: "/lender?tab=offers" },
];

const desktopTabs: AppHeaderNavItem[] = [
  { id: "home", label: "Home", href: "/lender" },
  { id: "applications", label: "Applications", href: "/lender?tab=applications" },
  { id: "offers", label: "Offers", href: "/lender?tab=offers" },
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
  activeTab = "home",
  showNotifications = true,
  accountEmail,
}: {
  activeTab?: LenderTab;
  showNotifications?: boolean;
  accountEmail?: string;
}) {
  return (
    <AppHeader
      navItems={desktopTabs}
      activeNavId={activeTab}
      accountEmail={accountEmail}
      showNotifications={showNotifications}
      isAccountActive={activeTab === "profile" || activeTab === "account"}
      accountHref="/lender?tab=profile"
      accountLabel="Profile"
    />
  );
}

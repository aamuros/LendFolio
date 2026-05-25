import { AppBottomTabs, type AppBottomTab } from "@/components/app-bottom-tabs";

export type ManagerTab = "home" | "loans" | "proofs" | "lookup";

const tabs: AppBottomTab<ManagerTab>[] = [
  { id: "home", label: "Home", icon: "home", href: "/manager" },
  { id: "loans", label: "Loans", icon: "loans", href: "/manager/loans" },
  {
    id: "proofs",
    label: "Proofs",
    icon: "proofs",
    href: "/manager/repayments",
  },
  { id: "lookup", label: "Users", icon: "lookup", href: "/manager/lookup" },
];

export function ManagerBottomTabs({ activeTab }: { activeTab: ManagerTab | null }) {
  return (
    <AppBottomTabs
      tabs={tabs}
      activeTab={activeTab}
      ariaLabel="Manager sections"
    />
  );
}

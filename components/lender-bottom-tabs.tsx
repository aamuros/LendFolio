import Link from "next/link";
import { User } from "lucide-react";
import { AppBottomTabs, type AppBottomTab } from "@/components/app-bottom-tabs";
import { NotificationButton } from "@/components/notification-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const desktopTabs: { id: LenderTab; label: string; href: string }[] = [
  { id: "home", label: "Home", href: "/lender" },
  { id: "applications", label: "Applications", href: "/lender/applications" },
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
  showAccountLink = true,
  showNotifications = true,
}: {
  activeTab?: LenderTab;
  showAccountLink?: boolean;
  showNotifications?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <p className="text-base font-semibold tracking-tight text-foreground">
          LendFolio
        </p>
        <nav className="hidden items-center gap-1 sm:flex">
          {desktopTabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                activeTab === tab.id
                  ? "bg-foreground text-background hover:bg-foreground hover:text-background"
                  : "text-muted-foreground",
              )}
            >
              <Link href={tab.href}>{tab.label}</Link>
            </Button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {showNotifications ? <NotificationButton /> : null}
        {showAccountLink ? (
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="Open account"
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <Link href="/lender?tab=account">
              <User className="size-5" />
            </Link>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

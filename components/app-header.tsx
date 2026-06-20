"use client";

import Link from "next/link";
import { User, LogOut, UserCircle } from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { NotificationButton } from "@/components/notification-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type AppHeaderNavItem = {
  id: string;
  label: string;
  href?: string;
};

export function AppHeader({
  navItems,
  activeNavId,
  onNavChange,
  accountEmail = "",
  showNotifications = true,
  showAccountMenu = true,
  isAccountActive = false,
  onAccountClick,
  accountHref,
  accountLabel = "Account",
}: {
  navItems: AppHeaderNavItem[];
  activeNavId: string;
  onNavChange?: (id: string) => void;
  accountEmail?: string;
  showNotifications?: boolean;
  showAccountMenu?: boolean;
  isAccountActive?: boolean;
  onAccountClick?: () => void;
  accountHref?: string;
  accountLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:min-h-16 sm:flex-nowrap sm:gap-5 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            aria-label="LendFolio home"
          >
            <Logo size="sm" priority />
          </Link>
          <nav className="hidden min-w-0 items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const isActive = activeNavId === item.id;
              const activeClassName = cn(
                "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={activeClassName}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onNavChange?.(item.id)}
                  className={activeClassName}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          {showNotifications ? <NotificationButton /> : null}
          {showAccountMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open profile menu"
                  className={cn(
                    "size-10 rounded-xl border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    isAccountActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                  )}
                >
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 max-w-[calc(100vw-2rem)]"
              >
                <DropdownMenuLabel className="break-all pr-2 text-xs leading-5 font-semibold">
                  {accountEmail || "Account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onAccountClick ? (
                  <DropdownMenuItem onClick={onAccountClick}>
                    <UserCircle className="size-4" />
                    {accountLabel}
                  </DropdownMenuItem>
                ) : accountHref ? (
                  <DropdownMenuItem asChild>
                    <Link href={accountHref}>
                      <UserCircle className="size-4" />
                      {accountLabel}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      (e.target as HTMLElement).closest("form")?.requestSubmit();
                    }}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}

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
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:gap-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            aria-label="LendFolio home"
          >
            <Logo size="sm" priority />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const isActive = activeNavId === item.id;
              const activeClassName = cn(
                "relative px-1.5 py-0.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-foreground after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:bg-foreground"
                  : "text-muted-foreground hover:text-foreground",
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
        <div className="flex items-center gap-1.5">
          {showNotifications ? <NotificationButton /> : null}
          {showAccountMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open profile menu"
                  className={cn(
                    "rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground",
                    isAccountActive && "bg-accent text-accent-foreground",
                  )}
                >
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-semibold">
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

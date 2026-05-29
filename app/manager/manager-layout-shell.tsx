"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  Receipt,
  ClipboardList,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/lookup", label: "Users", icon: Users },
  { href: "/manager/applications", label: "Applications & Offers", icon: FileText },
  { href: "/manager/loans", label: "Active Loans", icon: Wallet },
  { href: "/manager/repayments", label: "Repayment Proofs", icon: Receipt },
  { href: "/manager/borrower-verifications", label: "Borrower Review", icon: ShieldCheck },
  { href: "/manager/lenders", label: "Lender Review", icon: UserCheck },
  { href: "/manager/audit-logs", label: "Audit Logs", icon: ClipboardList },
];

function isActiveHref(pathname: string, href: string) {
  if (href === "/manager") return pathname === "/manager";
  return pathname.startsWith(href);
}

export function ManagerLayoutShell({
  children,
  userEmail,
  signOutAction,
}: {
  children: ReactNode;
  userEmail: string | null;
  signOutAction: () => void;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">LendFolio</span>
              <span className="truncate text-xs text-muted-foreground">
                Manager Console
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActiveHref(pathname, item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Users className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userEmail ?? "Manager"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        Manager
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-(--radix-dropdown-menu-trigger-width)"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userEmail ?? "Manager"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        Manager account
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/manager">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form action={signOutAction}>
                    <DropdownMenuItem asChild>
                      <button type="submit" className="w-full text-left">
                        Sign out
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export function ManagerTopBar({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <div className="flex flex-1 items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {description}
          </p>
        </div>
      </div>
    </header>
  );
}

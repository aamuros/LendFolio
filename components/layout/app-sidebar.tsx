"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import type { AppRole } from "@/lib/supabase/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { getNavConfigForRole, isActiveHref } from "@/components/layout/dashboard-nav-data";

export function AppSidebar({
  role,
  brandLabel,
  roleLabel,
  dashboardHref,
  userEmail,
  signOutAction,
}: {
  role: AppRole;
  brandLabel: string;
  roleLabel: string;
  dashboardHref: string;
  userEmail: string | null;
  signOutAction: () => void;
}) {
  const pathname = usePathname();
  const navConfig = getNavConfigForRole(role);
  const navGroups = navConfig?.groups ?? [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">LendFolio</span>
            <span className="truncate text-xs text-muted-foreground">
              {brandLabel}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActiveHref(pathname, item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu
          userEmail={userEmail}
          roleLabel={roleLabel}
          dashboardHref={dashboardHref}
          signOutAction={signOutAction}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

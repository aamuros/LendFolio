"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/supabase/types";
import type { WorkspaceConfig } from "@/lib/app-roles";
import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationUnreadBadge } from "@/components/layout/notification-unread-badge";
import { getNavConfigForRole, isActiveHref } from "@/components/layout/dashboard-nav-data";
import { cn } from "@/lib/utils";

export function AppSidebar({
  role,
  brandLabel,
  roleLabel,
  dashboardHref,
  userEmail,
  signOutAction,
  alternateWorkspaces,
}: {
  role: AppRole;
  brandLabel: string;
  roleLabel: string;
  dashboardHref: string;
  userEmail: string | null;
  signOutAction: () => void;
  alternateWorkspaces: WorkspaceConfig[];
}) {
  const pathname = usePathname();
  const navConfig = getNavConfigForRole(role);
  const navGroups = navConfig?.groups ?? [];
  const isManager = role === "manager";

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        isManager &&
          "border-sidebar-border/80 bg-sidebar/95 [--sidebar-accent:#eff3ea] [--sidebar-accent-foreground:#33423c]",
      )}
    >
      <SidebarHeader className={cn(isManager && "border-b border-sidebar-border/70 p-3")}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className={cn(
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                isManager &&
                  "h-13 rounded-xl hover:bg-sidebar-accent/80 data-[state=open]:bg-sidebar-accent",
              )}
            >
              <Link href={dashboardHref}>
                <Logo variant="icon" size="md" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">LendFolio</span>
                  <span className="truncate text-xs text-sidebar-foreground/65">
                    {brandLabel}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                      className={cn(
                        isManager &&
                          "rounded-lg text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-[inset_3px_0_0_#33423c]",
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.showUnreadBadge ? <NotificationUnreadBadge /> : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2 pb-3">
        <UserMenu
          userEmail={userEmail}
          roleLabel={roleLabel}
          signOutAction={signOutAction}
          alternateWorkspaces={alternateWorkspaces}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

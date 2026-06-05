"use client";

import type { ReactNode } from "react";
import type { AppRole } from "@/lib/supabase/types";
import type { WorkspaceConfig } from "@/lib/app-roles";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function DashboardShell({
  children,
  role,
  brandLabel,
  roleLabel,
  dashboardHref,
  userEmail,
  signOutAction,
  alternateWorkspaces,
}: {
  children: ReactNode;
  role: AppRole;
  brandLabel: string;
  roleLabel: string;
  dashboardHref: string;
  userEmail: string | null;
  signOutAction: () => void;
  alternateWorkspaces: WorkspaceConfig[];
}) {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <AppSidebar
          role={role}
          brandLabel={brandLabel}
          roleLabel={roleLabel}
          dashboardHref={dashboardHref}
          userEmail={userEmail}
          signOutAction={signOutAction}
          alternateWorkspaces={alternateWorkspaces}
        />
        <SidebarInset>{children}</SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}

export function DashboardTopBar({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
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

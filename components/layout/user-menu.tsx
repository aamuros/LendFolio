"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, ArrowRightLeft } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { WorkspaceConfig } from "@/lib/app-roles";

export function UserMenu({
  userEmail,
  roleLabel,
  signOutAction,
  alternateWorkspaces,
}: {
  userEmail: string | null;
  roleLabel: string;
  signOutAction: () => void;
  alternateWorkspaces: WorkspaceConfig[];
}) {
  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : roleLabel.slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar size="sm">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">
                  {userEmail ?? roleLabel}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {userEmail ?? roleLabel}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            {alternateWorkspaces.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {alternateWorkspaces.map((ws) => (
                  <DropdownMenuItem key={ws.role} asChild>
                    <Link href={ws.route}>
                      <ArrowRightLeft />
                      Switch to {ws.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem variant="destructive" asChild>
                <button type="submit" className="w-full">
                  <LogOut />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

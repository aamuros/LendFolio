import type { AppRole } from "@/lib/supabase/types";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Receipt,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  Users,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export type RoleNavConfig = {
  role: AppRole;
  label: string;
  groups: NavGroup[];
};

export const managerNavGroups: NavGroup[] = [
  {
    title: "Platform",
    items: [
      { title: "Overview", href: "/manager", icon: LayoutDashboard },
      { title: "Applications", href: "/manager/applications", icon: FileText },
      { title: "Loans", href: "/manager/loans", icon: Wallet },
      { title: "Repayments", href: "/manager/repayments", icon: Receipt },
    ],
  },
  {
    title: "Reviews",
    items: [
      {
        title: "Borrower Verifications",
        href: "/manager/borrower-verifications",
        icon: ShieldCheck,
      },
      { title: "Lenders", href: "/manager/lenders", icon: UserCheck },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Users", href: "/manager/lookup", icon: Users },
      { title: "Audit Logs", href: "/manager/audit-logs", icon: ClipboardList },
    ],
  },
];

export const roleNavConfigs: RoleNavConfig[] = [
  { role: "manager", label: "Manager Console", groups: managerNavGroups },
];

export function getNavConfigForRole(role: AppRole): RoleNavConfig | undefined {
  return roleNavConfigs.find((config) => config.role === role);
}

export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/manager" || href === "/borrower" || href === "/lender") {
    return pathname === href;
  }

  if (href === "/manager/lookup") {
    return pathname.startsWith("/manager/lookup") || pathname.startsWith("/manager/users");
  }

  return pathname.startsWith(href);
}

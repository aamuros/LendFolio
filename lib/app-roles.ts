import type { AppRole } from "@/lib/supabase/types";

export type WorkspaceConfig = {
  role: AppRole;
  title: string;
  route: string;
  description: string;
};

export const workspaceConfigs: WorkspaceConfig[] = [
  {
    role: "borrower",
    title: "Borrower workspace",
    route: "/borrower",
    description: "Create a business profile and request financing.",
  },
  {
    role: "lender",
    title: "Lender workspace",
    route: "/lender",
    description: "Review applications and send offers.",
  },
  {
    role: "manager",
    title: "Manager workspace",
    route: "/manager",
    description: "Monitor platform activity.",
  },
];

export function getWorkspaceConfig(role: AppRole) {
  return workspaceConfigs.find((workspace) => workspace.role === role);
}

export function getRouteForRole(role: AppRole) {
  return getWorkspaceConfig(role)?.route ?? "/";
}

export function getAllRoles(profile: {
  role: AppRole;
  additional_roles: AppRole[];
}): AppRole[] {
  return [profile.role, ...profile.additional_roles];
}

export function getAlternateWorkspaces(profile: {
  role: AppRole;
  additional_roles: AppRole[];
  status: string;
}): WorkspaceConfig[] {
  if (profile.status !== "active") return [];
  const allRoles = getAllRoles(profile);
  return workspaceConfigs.filter(
    (ws) => allRoles.includes(ws.role) && ws.role !== profile.role,
  );
}

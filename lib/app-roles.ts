import type { AppRole } from "@/lib/supabase/types";

export type PortalConfig = {
  role: AppRole;
  title: string;
  route: string;
  loginRoute: string;
  description: string;
};

export const portalConfigs: PortalConfig[] = [
  {
    role: "borrower",
    title: "Borrower portal",
    route: "/borrower",
    loginRoute: "/login?role=borrower",
    description: "Create a business profile and request financing.",
  },
  {
    role: "lender",
    title: "Lender portal",
    route: "/lender",
    loginRoute: "/login?role=lender",
    description: "Review applications and send offers.",
  },
  {
    role: "manager",
    title: "Manager portal",
    route: "/manager",
    loginRoute: "/login?role=manager",
    description: "Monitor platform activity.",
  },
];

export function getPortalConfig(role: AppRole) {
  return portalConfigs.find((portal) => portal.role === role);
}

export function getRouteForRole(role: AppRole) {
  return getPortalConfig(role)?.route ?? "/";
}

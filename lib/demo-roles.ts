export type DemoRole = "borrower" | "lender" | "manager";

export type DemoRoleConfig = {
  role: DemoRole;
  title: string;
  route: string;
  loginRoute: string;
  demoEmail: string;
  state: string;
  nextAction: string;
  laterSprint: string;
};

export const demoRoles: DemoRoleConfig[] = [
  {
    role: "borrower",
    title: "Borrower",
    route: "/borrower",
    loginRoute: "/login?role=borrower",
    demoEmail: "borrower.demo@example.com",
    state: "Demo sign-in required for Supabase testing",
    nextAction: "Save a portfolio, submit one loan application, and review lender offers.",
    laterSprint: "Sprint 1: borrower portfolio and loan application workflow.",
  },
  {
    role: "lender",
    title: "Lender",
    route: "/lender",
    loginRoute: "/login?role=lender",
    demoEmail: "lender.demo@example.com",
    state: "Demo sign-in required for Supabase testing",
    nextAction: "Review submitted/open applications and send official pending offers.",
    laterSprint: "Later sprints: lender verification and assignment rules.",
  },
  {
    role: "manager",
    title: "Manager",
    route: "/manager",
    loginRoute: "/login?role=manager",
    demoEmail: "manager.demo@example.com",
    state: "Demo sign-in required for Supabase testing",
    nextAction: "Use the placeholder shell until manager monitoring is in scope.",
    laterSprint: "Sprint 2+: operational monitoring and audit log review.",
  },
];

export function getDemoRole(role: DemoRole) {
  return demoRoles.find((demoRole) => demoRole.role === role);
}

export function getDemoRoleByEmail(email?: string | null) {
  if (!email) {
    return undefined;
  }

  return demoRoles.find(
    (demoRole) => demoRole.demoEmail.toLowerCase() === email.toLowerCase(),
  );
}

export function getDemoRedirectForEmail(email?: string | null) {
  return getDemoRoleByEmail(email)?.route;
}

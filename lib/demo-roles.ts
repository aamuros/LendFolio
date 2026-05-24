export type DemoRole = "borrower" | "lender" | "manager";

export type DemoRoleConfig = {
  role: DemoRole;
  title: string;
  route: string;
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
    demoEmail: "borrower.demo@example.com",
    state: "Mocked: no verified portfolio yet",
    nextAction: "Sprint 1 will add portfolio setup before loan application submission.",
    laterSprint: "Sprint 1: borrower portfolio and loan application workflow.",
  },
  {
    role: "lender",
    title: "Lender",
    route: "/lender",
    demoEmail: "lender.demo@example.com",
    state: "Mocked: lender verification pending",
    nextAction: "Sprint 1 will add application review surfaces after borrower submission exists.",
    laterSprint: "Sprint 1: application review; Sprint 2: official offer creation.",
  },
  {
    role: "manager",
    title: "Manager",
    route: "/manager",
    demoEmail: "manager.demo@example.com",
    state: "Mocked: platform activity unavailable",
    nextAction: "Later sprints will add monitoring once real workflow events exist.",
    laterSprint: "Sprint 2+: operational monitoring and audit log review.",
  },
];

export function getDemoRole(role: DemoRole) {
  return demoRoles.find((demoRole) => demoRole.role === role);
}

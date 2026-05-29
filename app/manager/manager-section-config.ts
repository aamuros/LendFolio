export type ManagerSectionId =
  | "lookup"
  | "loans"
  | "repayments"
  | "auditLogs"
  | "applications";

export type ManagerFilterField =
  | {
      type: "text" | "search" | "date";
      name: string;
      label: string;
    }
  | {
      type: "select";
      name: string;
      label: string;
      emptyLabel?: string;
      options: Array<{ value: string; label: string }>;
    };

export type ManagerSectionConfig = {
  id: ManagerSectionId;
  title: string;
  href: string;
  shortLabel: string;
  description: string;
  resetHref: string;
  filters: ManagerFilterField[];
};

export const managerSectionConfigs: Record<
  ManagerSectionId,
  ManagerSectionConfig
> = {
  lookup: {
    id: "lookup",
    title: "Users",
    href: "/manager/lookup",
    shortLabel: "Users",
    description: "Search users, borrower records, applications, and loans.",
    resetHref: "/manager/lookup",
    filters: [
      { type: "search", name: "q", label: "Search users" },
      {
        type: "select",
        name: "role",
        label: "Role",
        emptyLabel: "All roles",
        options: [
          { value: "borrower", label: "Borrower" },
          { value: "lender", label: "Lender" },
          { value: "manager", label: "Manager" },
        ],
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        emptyLabel: "Any status",
        options: [
          { value: "active", label: "Active" },
          { value: "pending", label: "Pending" },
          { value: "suspended", label: "Suspended" },
        ],
      },
    ],
  },
  loans: {
    id: "loans",
    title: "Loans",
    href: "/manager/loans",
    shortLabel: "Loans",
    description: "Track funded loans and repayment progress.",
    resetHref: "/manager/loans",
    filters: [
      {
        type: "select",
        name: "status",
        label: "Status",
        options: [
          { value: "active", label: "Active" },
          { value: "paid", label: "Paid" },
          { value: "overdue", label: "Overdue" },
          { value: "defaulted", label: "Defaulted" },
          { value: "closed", label: "Closed" },
        ],
      },
      { type: "text", name: "lender", label: "Lender" },
      { type: "text", name: "borrower", label: "Borrower" },
      { type: "date", name: "dueFrom", label: "Due date from" },
      { type: "date", name: "dueTo", label: "Due date to" },
    ],
  },
  repayments: {
    id: "repayments",
    title: "Proofs",
    href: "/manager/repayments",
    shortLabel: "Proofs",
    description: "Monitor submitted, verified, and rejected proof.",
    resetHref: "/manager/repayments",
    filters: [
      {
        type: "select",
        name: "proofStatus",
        label: "Proof status",
        options: [
          { value: "submitted", label: "Submitted" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ],
      },
      {
        type: "select",
        name: "repaymentStatus",
        label: "Repayment status",
        options: [
          { value: "due", label: "Due" },
          { value: "submitted", label: "Submitted" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
          { value: "late", label: "Late" },
        ],
      },
      { type: "text", name: "lender", label: "Lender" },
      { type: "text", name: "borrower", label: "Borrower" },
      {
        type: "select",
        name: "range",
        label: "Submitted range",
        emptyLabel: "Any time",
        options: [
          { value: "this_week", label: "This week" },
          { value: "this_month", label: "This month" },
          { value: "this_year", label: "This year" },
          { value: "custom", label: "Custom" },
        ],
      },
      { type: "date", name: "submittedFrom", label: "Submitted from" },
      { type: "date", name: "submittedTo", label: "Submitted to" },
    ],
  },
  auditLogs: {
    id: "auditLogs",
    title: "Logs",
    href: "/manager/audit-logs",
    shortLabel: "Logs",
    description: "Review workflow events across the platform.",
    resetHref: "/manager/audit-logs",
    filters: [
      { type: "text", name: "action", label: "Action" },
      { type: "text", name: "targetTable", label: "Target table" },
      { type: "text", name: "actor", label: "Actor" },
      { type: "date", name: "createdFrom", label: "Created from" },
      { type: "date", name: "createdTo", label: "Created to" },
    ],
  },
  applications: {
    id: "applications",
    title: "Applications",
    href: "/manager/applications",
    shortLabel: "Applications",
    description: "Follow application and offer lifecycles.",
    resetHref: "/manager/applications",
    filters: [
      {
        type: "select",
        name: "status",
        label: "Application status",
        options: [
          { value: "submitted", label: "Submitted" },
          { value: "open", label: "Open" },
          { value: "accepted", label: "Accepted" },
          { value: "declined", label: "Declined" },
          { value: "withdrawn", label: "Withdrawn" },
        ],
      },
      { type: "text", name: "borrower", label: "Borrower" },
      {
        type: "select",
        name: "preferredTerm",
        label: "Preferred term",
        options: [
          { value: "1_month", label: "1 month" },
          { value: "3_months", label: "3 months" },
          { value: "6_months", label: "6 months" },
          { value: "12_months", label: "12 months" },
        ],
      },
      { type: "date", name: "submittedFrom", label: "Submitted from" },
      { type: "date", name: "submittedTo", label: "Submitted to" },
    ],
  },
};

export const managerSectionOrder: ManagerSectionId[] = [
  "lookup",
  "loans",
  "repayments",
  "auditLogs",
  "applications",
];

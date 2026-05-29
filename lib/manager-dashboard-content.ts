import type { ComponentType } from "react";
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  UserCheck,
  Wallet,
  Receipt,
  ClipboardList,
  Users,
  AlertTriangle,
  CheckCircle2,
  Eye,
  type LucideProps,
} from "lucide-react";

type LucideIcon = ComponentType<LucideProps>;

// ---------------------------------------------------------------------------
// 1. Manager navigation
// ---------------------------------------------------------------------------

export type ManagerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const managerDashboardNavItems: ManagerNavItem[] = [
  {
    label: "Overview",
    href: "/manager",
    icon: LayoutDashboard,
    description: "Platform health, queues, and recent activity.",
  },
  {
    label: "Applications",
    href: "/manager/applications",
    icon: FileText,
    description: "Loan applications and offer lifecycles.",
  },
  {
    label: "Borrower Verifications",
    href: "/manager/borrower-verifications",
    icon: ShieldCheck,
    description: "Document reviews and borrower approval queue.",
  },
  {
    label: "Lenders",
    href: "/manager/lenders",
    icon: UserCheck,
    description: "Lender registration reviews and approvals.",
  },
  {
    label: "Loans",
    href: "/manager/loans",
    icon: Wallet,
    description: "Active loans, balances, and repayment progress.",
  },
  {
    label: "Repayments",
    href: "/manager/repayments",
    icon: Receipt,
    description: "Payment proof submissions and verification.",
  },
  {
    label: "Audit Logs",
    href: "/manager/audit-logs",
    icon: ClipboardList,
    description: "Platform events and compliance activity.",
  },
  {
    label: "Users",
    href: "/manager/lookup",
    icon: Users,
    description: "Search users, borrower records, applications, and loans.",
  },
];

// ---------------------------------------------------------------------------
// 2. Manager metric definitions
// ---------------------------------------------------------------------------

export type ManagerMetricStatus = "attention" | "healthy" | "warning" | "neutral";

export type ManagerMetricDefinition = {
  key: string;
  title: string;
  description: string;
  value: number;
  helperText: string;
  href: string;
  icon: LucideIcon;
  status: ManagerMetricStatus;
};

// PLACEHOLDER values — replace with live queries in the dashboard implementation.
export const managerDashboardMockMetrics: ManagerMetricDefinition[] = [
  {
    key: "pending_borrower_verifications",
    title: "Pending borrower verifications",
    description: "Borrower profiles waiting for document review.",
    value: 4,
    helperText: "+2 since yesterday",
    href: "/manager/borrower-verifications?status=submitted",
    icon: ShieldCheck,
    status: "attention",
  },
  {
    key: "pending_lender_reviews",
    title: "Pending lender reviews",
    description: "Lender accounts awaiting approval.",
    value: 2,
    helperText: "1 new this week",
    href: "/manager/lenders?verificationStatus=pending",
    icon: UserCheck,
    status: "attention",
  },
  {
    key: "open_loan_applications",
    title: "Open loan applications",
    description: "Loan applications currently available for review.",
    value: 7,
    helperText: "3 submitted today",
    href: "/manager/applications?status=submitted",
    icon: FileText,
    status: "warning",
  },
  {
    key: "repayment_proofs_awaiting_review",
    title: "Repayment proofs awaiting review",
    description: "Payment proofs that need attention.",
    value: 5,
    helperText: "Oldest: 2 days ago",
    href: "/manager/repayments?proofStatus=submitted",
    icon: Eye,
    status: "attention",
  },
  {
    key: "overdue_repayments",
    title: "Overdue repayments",
    description: "Repayment schedules past their due date.",
    value: 3,
    helperText: "₱12,500 total outstanding",
    href: "/manager/repayments?repaymentStatus=late",
    icon: AlertTriangle,
    status: "warning",
  },
  {
    key: "active_loans",
    title: "Active loans",
    description: "Funded loans currently in progress.",
    value: 18,
    helperText: "₱145,000 total disbursed",
    href: "/manager/loans?status=active",
    icon: Wallet,
    status: "healthy",
  },
  {
    key: "approved_lenders",
    title: "Approved lenders",
    description: "Verified and active lender accounts.",
    value: 6,
    helperText: "No change this week",
    href: "/manager/lenders?verificationStatus=approved",
    icon: CheckCircle2,
    status: "healthy",
  },
  {
    key: "recent_audit_events",
    title: "Recent audit events",
    description: "Platform events logged in the last 24 hours.",
    value: 12,
    helperText: "Last event: 15 min ago",
    href: "/manager/audit-logs",
    icon: ClipboardList,
    status: "neutral",
  },
];

// ---------------------------------------------------------------------------
// 3. Manager operations queue
// ---------------------------------------------------------------------------

export type ManagerQueueItemType =
  | "borrower_verification"
  | "lender_review"
  | "loan_application"
  | "repayment_proof"
  | "audit_event"
  | "user_lookup";

export type ManagerQueuePriority = "high" | "medium" | "low";

export type ManagerQueueStatus =
  | "pending"
  | "needs_review"
  | "approved"
  | "rejected"
  | "active"
  | "overdue"
  | "resolved"
  | "submitted"
  | "withdrawn";

export type ManagerQueueRow = {
  id: string;
  type: ManagerQueueItemType;
  subject: string;
  status: ManagerQueueStatus;
  priority: ManagerQueuePriority;
  updated: string;
  href: string;
};

// PLACEHOLDER rows — replace with live queue queries in the dashboard implementation.
export const managerOperationsQueueMockData: ManagerQueueRow[] = [
  {
    id: "queue-001",
    type: "borrower_verification",
    subject: "Maria Santos — Sari-sari store profile",
    status: "needs_review",
    priority: "high",
    updated: "2026-05-29T10:15:00+08:00",
    href: "/manager/borrower-verifications",
  },
  {
    id: "queue-002",
    type: "lender_review",
    subject: "Bayan Capital Cooperative",
    status: "pending",
    priority: "high",
    updated: "2026-05-29T09:40:00+08:00",
    href: "/manager/lenders",
  },
  {
    id: "queue-003",
    type: "loan_application",
    subject: "Application APP-2041 — Inventory financing",
    status: "submitted",
    priority: "medium",
    updated: "2026-05-29T08:30:00+08:00",
    href: "/manager/applications",
  },
  {
    id: "queue-004",
    type: "repayment_proof",
    subject: "Loan LF-1024 — ₱8,500 installment",
    status: "needs_review",
    priority: "medium",
    updated: "2026-05-28T16:20:00+08:00",
    href: "/manager/repayments",
  },
  {
    id: "queue-005",
    type: "audit_event",
    subject: "System audit — lender approval updated",
    status: "resolved",
    priority: "low",
    updated: "2026-05-28T14:00:00+08:00",
    href: "/manager/audit-logs",
  },
  {
    id: "queue-006",
    type: "borrower_verification",
    subject: "Juan dela Cruz — Food cart business",
    status: "pending",
    priority: "medium",
    updated: "2026-05-28T11:45:00+08:00",
    href: "/manager/borrower-verifications",
  },
  {
    id: "queue-007",
    type: "repayment_proof",
    subject: "Loan LF-1038 — ₱4,200 monthly payment",
    status: "submitted",
    priority: "low",
    updated: "2026-05-27T17:10:00+08:00",
    href: "/manager/repayments",
  },
  {
    id: "queue-008",
    type: "loan_application",
    subject: "Application APP-2055 — Equipment purchase",
    status: "submitted",
    priority: "medium",
    updated: "2026-05-27T15:30:00+08:00",
    href: "/manager/applications",
  },
  {
    id: "queue-009",
    type: "user_lookup",
    subject: "Search: Ana Reyes — borrower account",
    status: "active",
    priority: "low",
    updated: "2026-05-27T12:00:00+08:00",
    href: "/manager/lookup",
  },
  {
    id: "queue-010",
    type: "lender_review",
    subject: "Metro Lending Solutions",
    status: "pending",
    priority: "medium",
    updated: "2026-05-26T09:20:00+08:00",
    href: "/manager/lenders",
  },
];

// ---------------------------------------------------------------------------
// 4. Status and priority labels
// ---------------------------------------------------------------------------

export const managerDashboardStatusLabels: Record<ManagerQueueStatus, string> = {
  pending: "Pending",
  needs_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
  overdue: "Overdue",
  resolved: "Resolved",
  submitted: "Submitted",
  withdrawn: "Withdrawn",
};

export const managerDashboardPriorityLabels: Record<ManagerQueuePriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const managerDashboardStatusVariants: Record<
  ManagerQueueStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  needs_review: "secondary",
  approved: "default",
  rejected: "destructive",
  active: "default",
  overdue: "destructive",
  resolved: "outline",
  submitted: "secondary",
  withdrawn: "outline",
};

export const managerDashboardPriorityVariants: Record<
  ManagerQueuePriority,
  "default" | "secondary" | "destructive" | "outline"
> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export const managerQueueItemTypeLabels: Record<ManagerQueueItemType, string> = {
  borrower_verification: "Borrower verification",
  lender_review: "Lender review",
  loan_application: "Loan application",
  repayment_proof: "Repayment proof",
  audit_event: "Audit event",
  user_lookup: "User lookup",
};

// ---------------------------------------------------------------------------
// 5. Dashboard copy
// ---------------------------------------------------------------------------

export const managerDashboardCopy = {
  pageTitle: "Manager dashboard",
  pageDescription:
    "Monitor platform activity, pending reviews, and operational health.",

  metricsSectionTitle: "Key metrics",
  metricsSectionDescription:
    "Items that need manager attention or provide quick operational context.",

  queueSectionTitle: "Operations queue",
  queueSectionDescription:
    "Recent items requiring action or review, ordered by priority.",

  activitySectionTitle: "Platform activity",
  activitySectionDescription:
    "Weekly volume of applications, verifications, lender reviews, and repayment reviews.",

  emptyQueueTitle: "No pending items",
  emptyQueueDescription:
    "All operations are up to date. Check back later for new activity.",

  emptyActivityTitle: "No activity data",
  emptyActivityDescription:
    "Activity trends will appear once platform workflows generate events.",

  overviewCardDescription:
    "Quick view of platform operations and items requiring attention.",
  applicationsCardDescription: "Follow application and offer lifecycles.",
  borrowerVerificationsCardDescription:
    "Borrower profiles waiting for document review.",
  lendersCardDescription: "Lender accounts awaiting approval.",
  loansCardDescription: "Track funded loans and repayment progress.",
  repaymentsCardDescription: "Payment proofs that need attention.",
  auditLogsCardDescription:
    "Recent platform events and compliance activity.",
  usersCardDescription: "Search users, borrower records, applications, loans, and repayment activity.",
} as const;

// ---------------------------------------------------------------------------
// 6. Activity chart placeholder data
// ---------------------------------------------------------------------------

export type ManagerActivitySeriesPoint = {
  date: string;
  value: number;
};

export type ManagerActivitySeries = {
  key: string;
  label: string;
  color: string;
  data: ManagerActivitySeriesPoint[];
};

// PLACEHOLDER data — replace with real aggregation queries in the dashboard implementation.
export const managerActivityMockData: ManagerActivitySeries[] = [
  {
    key: "applications",
    label: "Applications",
    color: "var(--chart-1)",
    data: [
      { date: "2026-05-23", value: 3 },
      { date: "2026-05-24", value: 1 },
      { date: "2026-05-25", value: 4 },
      { date: "2026-05-26", value: 2 },
      { date: "2026-05-27", value: 5 },
      { date: "2026-05-28", value: 3 },
      { date: "2026-05-29", value: 2 },
    ],
  },
  {
    key: "verifications",
    label: "Verifications",
    color: "var(--chart-2)",
    data: [
      { date: "2026-05-23", value: 1 },
      { date: "2026-05-24", value: 2 },
      { date: "2026-05-25", value: 0 },
      { date: "2026-05-26", value: 3 },
      { date: "2026-05-27", value: 1 },
      { date: "2026-05-28", value: 2 },
      { date: "2026-05-29", value: 4 },
    ],
  },
  {
    key: "lender_reviews",
    label: "Lender reviews",
    color: "var(--chart-3)",
    data: [
      { date: "2026-05-23", value: 0 },
      { date: "2026-05-24", value: 1 },
      { date: "2026-05-25", value: 1 },
      { date: "2026-05-26", value: 0 },
      { date: "2026-05-27", value: 2 },
      { date: "2026-05-28", value: 1 },
      { date: "2026-05-29", value: 0 },
    ],
  },
  {
    key: "repayment_reviews",
    label: "Repayment reviews",
    color: "var(--chart-4)",
    data: [
      { date: "2026-05-23", value: 2 },
      { date: "2026-05-24", value: 3 },
      { date: "2026-05-25", value: 1 },
      { date: "2026-05-26", value: 4 },
      { date: "2026-05-27", value: 2 },
      { date: "2026-05-28", value: 3 },
      { date: "2026-05-29", value: 5 },
    ],
  },
];

// PLACEHOLDER 6-month aggregate data for a wider time range view.
export const managerActivityMonthlyMockData: ManagerActivitySeries[] = [
  {
    key: "applications",
    label: "Applications",
    color: "var(--chart-1)",
    data: [
      { date: "2025-12", value: 12 },
      { date: "2026-01", value: 18 },
      { date: "2026-02", value: 15 },
      { date: "2026-03", value: 22 },
      { date: "2026-04", value: 19 },
      { date: "2026-05", value: 20 },
    ],
  },
  {
    key: "verifications",
    label: "Verifications",
    color: "var(--chart-2)",
    data: [
      { date: "2025-12", value: 8 },
      { date: "2026-01", value: 11 },
      { date: "2026-02", value: 9 },
      { date: "2026-03", value: 14 },
      { date: "2026-04", value: 10 },
      { date: "2026-05", value: 13 },
    ],
  },
  {
    key: "lender_reviews",
    label: "Lender reviews",
    color: "var(--chart-3)",
    data: [
      { date: "2025-12", value: 3 },
      { date: "2026-01", value: 5 },
      { date: "2026-02", value: 4 },
      { date: "2026-03", value: 6 },
      { date: "2026-04", value: 3 },
      { date: "2026-05", value: 4 },
    ],
  },
  {
    key: "repayment_reviews",
    label: "Repayment reviews",
    color: "var(--chart-4)",
    data: [
      { date: "2025-12", value: 10 },
      { date: "2026-01", value: 14 },
      { date: "2026-02", value: 12 },
      { date: "2026-03", value: 18 },
      { date: "2026-04", value: 16 },
      { date: "2026-05", value: 20 },
    ],
  },
];

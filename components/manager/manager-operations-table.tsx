import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ManagerEmptyState } from "./manager-empty-state";
import {
  ShieldCheck,
  UserCheck,
  FileText,
  Receipt,
  ClipboardList,
  ArrowUpRightIcon,
  ListTodo,
} from "lucide-react";

export type OperationsQueueItem = {
  id: string;
  type:
    | "borrower_verification"
    | "lender_review"
    | "loan_application"
    | "repayment_proof"
    | "audit_event";
  subject: string;
  status: string;
  priority: "high" | "medium" | "low";
  href: string;
};

const typeConfig: Record<
  OperationsQueueItem["type"],
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  borrower_verification: {
    label: "Borrower verification",
    icon: ShieldCheck,
    badgeVariant: "secondary",
  },
  lender_review: {
    label: "Lender review",
    icon: UserCheck,
    badgeVariant: "secondary",
  },
  loan_application: {
    label: "Loan application",
    icon: FileText,
    badgeVariant: "default",
  },
  repayment_proof: {
    label: "Repayment proof",
    icon: Receipt,
    badgeVariant: "secondary",
  },
  audit_event: {
    label: "Audit event",
    icon: ClipboardList,
    badgeVariant: "outline",
  },
};

const priorityConfig: Record<
  OperationsQueueItem["priority"],
  { label: string; variant: "destructive" | "secondary" | "outline" }
> = {
  high: { label: "High", variant: "destructive" },
  medium: { label: "Medium", variant: "secondary" },
  low: { label: "Low", variant: "outline" },
};

function reviewActionClassName(isHighPriority: boolean) {
  return cn(
    isHighPriority
      ? buttonVariants({ variant: "default", size: "sm" })
      : buttonVariants({ variant: "outline", size: "sm" }),
    isHighPriority &&
      "text-primary-foreground hover:text-primary-foreground [&_svg]:text-primary-foreground",
  );
}

export function ManagerOperationsTable({
  items,
}: {
  items: OperationsQueueItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations queue</CardTitle>
        <CardDescription>
          Items requiring manager attention, sorted by priority.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <div className="px-4">
            <ManagerEmptyState
              icon={ListTodo}
              title="No pending items"
              description="All operations are up to date. New borrower verifications, lender reviews, applications, or repayment proofs will appear here."
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const config = typeConfig[item.type];
                    const priority = priorityConfig[item.priority];
                    const IconComponent = config.icon;
                    const isHighPriority = item.priority === "high";

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          isHighPriority &&
                            "bg-destructive/5",
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <IconComponent className="size-3.5" />
                            </div>
                            <span className="text-sm font-medium">
                              {config.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{item.subject}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.badgeVariant}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priority.variant}>
                            {priority.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={item.href}
                            className={reviewActionClassName(isHighPriority)}
                          >
                            Review
                            <ArrowUpRightIcon className="size-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-2 px-4 md:hidden">
              {items.map((item) => {
                const config = typeConfig[item.type];
                const priority = priorityConfig[item.priority];
                const IconComponent = config.icon;
                const isHighPriority = item.priority === "high";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg border bg-card p-3",
                      isHighPriority
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-border/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {item.subject}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant={config.badgeVariant} className="text-[10px]">
                          {item.status}
                        </Badge>
                        <Badge variant={priority.variant} className="text-[10px]">
                          {priority.label}
                        </Badge>
                      </div>
                    </div>
                    <Link
                      href={item.href}
                      className={reviewActionClassName(isHighPriority)}
                    >
                      Review
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import type React from "react";
import { getShortId, managerStatusLabels } from "@/lib/manager-operations";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AutoFilterForm } from "./auto-filter-form";
import { ManagerTopBar } from "./manager-layout-shell";
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react";

export { formatDateOnly, formatDateTime } from "@/lib/manager-date-format";

export const managerNavItems = [
  { href: "/manager/loans", title: "Active loans", description: "Track funded loans and repayment progress." },
  { href: "/manager/repayments", title: "Repayment proofs", description: "Monitor submitted, verified, and rejected proof." },
  { href: "/manager/audit-logs", title: "Audit logs", description: "Review workflow events across the platform." },
  { href: "/manager/applications", title: "Applications & offers", description: "Follow application and offer lifecycles." },
  { href: "/manager/lookup", title: "Users", description: "Search users, borrower records, applications, and loans." },
];

export function ManagerShell({
  title,
  description,
  showHeading = true,
  children,
}: {
  title: string;
  description: string;
  showHeading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <ManagerTopBar title={title} description={description} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1600px]">
          {showHeading ? (
            <div className="mb-4">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </>
  );
}

export function AccessDenied({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Access Denied</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function StatusMessage({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "error";
}) {
  return (
    <Alert variant={tone === "error" ? "destructive" : "default"}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function FilterGrid({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {children}
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              asChild
            >
              <Link href="?">Clear</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AutoFilterGrid({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <AutoFilterForm className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </AutoFilterForm>
      </CardContent>
    </Card>
  );
}

export function TextFilter({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-xs font-medium">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}

export function SelectFilter({
  label,
  name,
  defaultValue,
  options,
  emptyLabel = "Any",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-xs font-medium">
        {label}
      </Label>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-8 w-full rounded-md border px-3 py-1 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ManagerRecordList({ children }: { children: React.ReactNode }) {
  return <Card>{children}</Card>;
}

export function ManagerRecordHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground sm:grid",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ManagerDetailsLink({
  href,
  label = "Details",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const variant =
    role === "manager"
      ? "destructive"
      : role === "lender"
        ? "default"
        : "secondary";

  return (
    <Badge variant={variant} className="capitalize">
      {role}
    </Badge>
  );
}

export function ManagerRecordRow({ children }: { children: React.ReactNode }) {
  return (
    <article className="border-b last:border-b-0">
      {children}
    </article>
  );
}

export function DataCard({ children }: { children: React.ReactNode }) {
  return <Card>{children}</Card>;
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 text-sm">{children}</dl>
      </CardContent>
    </Card>
  );
}

export function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-2 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words">
        {value}
      </dd>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const positive = ["verified", "paid", "accepted", "active", "approved"];
  const warning = ["submitted", "pending", "due", "open"];
  const danger = ["rejected", "overdue", "defaulted", "declined", "late", "suspended"];
  const muted = ["closed", "withdrawn", "expired"];

  const variant = positive.includes(status)
    ? "default"
    : warning.includes(status)
      ? "secondary"
      : danger.includes(status)
        ? "destructive"
        : muted.includes(status)
          ? "outline"
          : "secondary";

  const className = positive.includes(status)
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
    : warning.includes(status)
      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
      : undefined;

  return (
    <Badge variant={variant as "default" | "secondary" | "destructive" | "outline"} className={className}>
      {managerStatusLabels[status as keyof typeof managerStatusLabels] ?? status}
    </Badge>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PersonLabel({
  person,
}: {
  person: { id: string; displayName: string };
}) {
  return (
    <span>
      {person.displayName}
      <span className="block text-xs font-normal text-muted-foreground">
        {getShortId(person.id)}
      </span>
    </span>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" className="w-fit gap-1" asChild>
      <Link href={href}>
        <ArrowLeftIcon className="size-4" />
        {label}
      </Link>
    </Button>
  );
}

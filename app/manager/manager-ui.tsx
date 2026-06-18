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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AlertCircleIcon, ArrowLeftIcon, InfoIcon } from "lucide-react";

export { SelectFilter, FilterForm } from "./auto-filter-form";

export { formatDateOnly, formatDateTime } from "@/lib/manager-date-format";


export function ManagerShell({
  title,
  description,
  showHeading = true,
  headerActions,
  children,
}: {
  title: string;
  description: string;
  showHeading?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="sticky top-0 z-30 flex h-12 min-w-0 shrink-0 items-center border-b border-border/70 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <SidebarTrigger />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(51,66,60,0.08),transparent_34rem)] px-4 py-4 md:py-6 lg:px-6">
        <div className="mx-auto w-full min-w-0 max-w-[1600px]">
          {showHeading ? (
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                {description ? (
                  <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              {headerActions ? (
                <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
              ) : null}
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
      {tone === "error" ? <AlertCircleIcon /> : <InfoIcon />}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
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

export function ManagerRecordList({ children }: { children: React.ReactNode }) {
  return <Card className="border-border/70 bg-card/95 shadow-[0_18px_50px_rgba(14,26,18,0.05)]">{children}</Card>;
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
        "hidden border-b border-border/70 bg-secondary/70 px-3 py-2 text-xs font-semibold text-secondary-foreground/80 sm:grid",
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

export function ResetFiltersLink({ href }: { href: string }) {
  return (
    <Button variant="ghost" size="sm" className="w-fit" asChild>
      <Link href={href}>Reset filters</Link>
    </Button>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const variant =
    role === "manager"
      ? "outline"
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
    <article className="border-b border-border/60 last:border-b-0">
      {children}
    </article>
  );
}

export function DataCard({ children }: { children: React.ReactNode }) {
  return <Card className="border-border/70 bg-card/95 shadow-[0_18px_50px_rgba(14,26,18,0.05)]">{children}</Card>;
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/60 px-3 py-2">
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
    <Card size="sm" className="border-border/70 bg-card/95">
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
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words">
        {value}
      </dd>
    </div>
  );
}

const statusPositive = ["verified", "paid", "accepted", "active", "approved"];
const statusInfo = ["submitted", "open", "pending", "under_review", "pending_documents"];
const statusWarning = ["due"];
const statusRose = ["needs_resubmission"];
const statusDanger = ["rejected", "overdue", "defaulted", "declined", "late", "suspended"];
const statusMuted = ["closed", "withdrawn", "expired", "incomplete", "not_started"];

export function StatusBadge({ status }: { status: string }) {
  const variant = statusPositive.includes(status)
    ? "default"
    : statusInfo.includes(status)
      ? "secondary"
      : statusWarning.includes(status)
        ? "secondary"
        : statusRose.includes(status)
          ? "secondary"
          : statusDanger.includes(status)
            ? "destructive"
            : statusMuted.includes(status)
              ? "outline"
              : "secondary";

  const className = statusPositive.includes(status)
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950"
    : statusInfo.includes(status)
      ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-950"
      : statusWarning.includes(status)
        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-950"
        : statusRose.includes(status)
          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-950"
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
    <Card className="border border-dashed border-border/80 bg-muted/60 ring-0">
      <CardContent className="flex flex-col items-center gap-1 py-8 text-center">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ListTable({ children }: { children: React.ReactNode }) {
  return <Card className="border-border/70 bg-card/95 py-0 shadow-[0_18px_50px_rgba(14,26,18,0.05)]">{children}</Card>;
}

export function MobileCard({ children }: { children: React.ReactNode }) {
  return (
    <Card size="sm" className="border-border/70 bg-card/95">
      <CardContent className="grid gap-2">{children}</CardContent>
    </Card>
  );
}

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
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

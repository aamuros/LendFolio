import Link from "next/link";
import type React from "react";
import { signOutAction } from "@/app/login/actions";
import {
  ManagerBottomTabs,
  type ManagerTab,
} from "@/components/manager-bottom-tabs";
import { getShortId, managerStatusLabels } from "@/lib/manager-operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AutoFilterForm } from "./auto-filter-form";

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
  activeTab = "home",
  showHeading = true,
  children,
}: {
  title: string;
  description: string;
  activeTab?: ManagerTab | null;
  showHeading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-svh px-5 pt-4 pb-36 sm:px-8 sm:pt-6">
      <div className="mx-auto grid max-w-4xl gap-5">
        <header className="flex min-h-10 items-center justify-between gap-4">
          <Link
            href="/manager"
            className="text-sm font-semibold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            LendFolio
          </Link>
          <ManagerAccountState />
        </header>
        {showHeading ? (
          <section className="grid gap-1">
            <h1 className="text-2xl leading-tight font-semibold">{title}</h1>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {description}
            </p>
          </section>
        ) : null}
        {children}
        <ManagerBottomTabs activeTab={activeTab} />
      </div>
    </main>
  );
}

export function AccessDenied({ message }: { message: string }) {
  return (
    <section
      className="rounded-3xl border border-[var(--border)] bg-white px-5 py-5 text-sm leading-6 text-[var(--muted-foreground)] shadow-sm"
      role="alert"
    >
      {message}
    </section>
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
    <p
      className={`rounded-3xl border px-4 py-3 text-sm leading-6 shadow-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-[var(--border)] bg-white text-[var(--muted-foreground)]"
      }`}
    >
      {message}
    </p>
  );
}

export function FilterGrid({ children }: { children: React.ReactNode }) {
  return (
    <form className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="h-10 flex-1 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:flex-none"
        >
          Apply
        </button>
        <Link
          href="?"
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:flex-none"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}

export function AutoFilterGrid({ children }: { children: React.ReactNode }) {
  return (
    <AutoFilterForm className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </AutoFilterForm>
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
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="h-10 w-full rounded-full border border-[var(--border)] bg-white px-4 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      />
    </label>
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
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 w-full rounded-full border border-[var(--border)] bg-white px-4 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ManagerRecordList({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      {children}
    </section>
  );
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
      className={`hidden border-b border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] sm:grid ${className}`}
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
    <Link
      href={href}
      className="inline-flex h-7 w-[4.5rem] items-center justify-center rounded-full border border-[var(--border)] px-2 text-[11px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
    >
      {label}
    </Link>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const className =
    role === "manager"
      ? "bg-[#ffe8ef] text-[#9f1744]"
      : role === "lender"
        ? "bg-[#e6f4ff] text-[#075985]"
        : "bg-[var(--muted)] text-[var(--muted-foreground)]";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${className}`}
    >
      {role}
    </span>
  );
}

export function ManagerRecordRow({ children }: { children: React.ReactNode }) {
  return (
    <article className="border-b border-[var(--border)] last:border-b-0">
      {children}
    </article>
  );
}

export function DataCard({ children }: { children: React.ReactNode }) {
  return (
    <article className="grid gap-4 rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm sm:px-5">
      {children}
    </article>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3">
      <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold break-words">{value}</dd>
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
    <section className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="grid gap-2 text-sm">{children}</dl>
    </section>
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
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)]/70 pb-2 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-xs font-semibold text-[var(--muted-foreground)]">
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
  const className = positive.includes(status)
    ? "bg-[#e1f5ee] text-[#0f5f45]"
    : warning.includes(status)
      ? "bg-[#fff7df] text-[#806000]"
      : danger.includes(status)
        ? "bg-[#fff4f4] text-[#8f1d1d]"
        : muted.includes(status)
          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
          : "bg-[#f7f9fc] text-[var(--foreground)]";

  return (
    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      {managerStatusLabels[status as keyof typeof managerStatusLabels] ?? status}
    </span>
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
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-5 py-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
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
      <span className="block text-xs font-normal text-[var(--muted-foreground)]">
        {getShortId(person.id)}
      </span>
    </span>
  );
}

async function ManagerAccountState() {
  const user = await getManagerUser();

  if (!user?.email) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
      >
        <AccountIcon />
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden max-w-52 truncate text-right text-xs font-semibold text-[var(--muted-foreground)] sm:block">
        {user.email}
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          aria-label="Sign out"
          title={user.email}
          className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          <AccountIcon />
        </button>
      </form>
    </div>
  );
}

async function getManagerUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
}

function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

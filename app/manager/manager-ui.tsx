import Link from "next/link";
import type React from "react";
import { AuthStatus } from "@/components/auth-status";
import { getShortId, managerStatusLabels } from "@/lib/manager-operations";

export const managerNavItems = [
  { href: "/manager/loans", title: "Active loans", description: "Track funded loans and repayment progress." },
  { href: "/manager/repayments", title: "Repayment proofs", description: "Monitor submitted, verified, and rejected proof." },
  { href: "/manager/audit-logs", title: "Audit logs", description: "Review workflow events across the platform." },
  { href: "/manager/applications", title: "Applications & offers", description: "Follow application and offer lifecycles." },
  { href: "/manager/lookup", title: "Lookup", description: "Search borrower, application, and loan records." },
];

export function ManagerShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-svh px-5 pt-4 pb-10 sm:px-8 sm:pt-6">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            >
              &lt;- LendFolio
            </Link>
            <AuthStatus role="manager" />
          </div>
          <div className="grid gap-3">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
              Manager operations
            </p>
            <div className="grid gap-2">
              <h1 className="text-3xl leading-tight font-semibold sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                {description}
              </p>
            </div>
          </div>
          <ManagerNav />
        </header>
        {children}
      </div>
    </main>
  );
}

export function ManagerNav() {
  return (
    <nav aria-label="Manager operations" className="overflow-x-auto">
      <div className="flex min-w-max gap-2">
        <NavPill href="/manager">Overview</NavPill>
        {managerNavItems.map((item) => (
          <NavPill key={item.href} href={item.href}>
            {item.title}
          </NavPill>
        ))}
      </div>
    </nav>
  );
}

function NavPill({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
    >
      {children}
    </Link>
  );
}

export function AccessDenied({ message }: { message: string }) {
  return (
    <section
      className="rounded-md border border-[var(--border)] bg-white px-4 py-4 text-sm leading-6 text-[var(--muted-foreground)]"
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
      className={`rounded-md border px-4 py-3 text-sm leading-6 ${
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
    <form className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="h-10 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          Apply
        </button>
        <Link
          href="?"
          className="inline-flex h-10 items-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold"
        >
          Clear
        </Link>
      </div>
    </form>
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
        className="h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      />
    </label>
  );
}

export function SelectFilter({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DataCard({ children }: { children: React.ReactNode }) {
  return (
    <article className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 shadow-sm">
      {children}
    </article>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="text-sm font-semibold break-words">{value}</dd>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs font-semibold">
      {managerStatusLabels[status as keyof typeof managerStatusLabels] ?? status}
    </span>
  );
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateOnly(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string | null) {
  if (!value) return "Not reviewed";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

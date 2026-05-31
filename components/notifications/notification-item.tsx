"use client";

import {
  formatNotificationDate,
  type AppNotification,
} from "@/lib/notifications";
import { NotificationTypeBadge } from "./notification-type-badge";
import {
  ChevronRight,
  CircleDollarSign,
  CircleCheckBig,
  XCircle,
  Upload,
  ClockAlert,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  FileText,
  Building2,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CategoryConfig = {
  icon: LucideIcon;
  bg: string;
  text: string;
};

const categoryConfig: Record<string, CategoryConfig> = {
  offer_received: {
    icon: CircleDollarSign,
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
  },
  offer_accepted: {
    icon: CircleCheckBig,
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  offer_declined: {
    icon: XCircle,
    bg: "bg-rose-100 dark:bg-rose-950",
    text: "text-rose-600 dark:text-rose-400",
  },
  repayment_proof_submitted: {
    icon: Upload,
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-600 dark:text-amber-400",
  },
  repayment_verified: {
    icon: CircleCheckBig,
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  repayment_rejected: {
    icon: XCircle,
    bg: "bg-rose-100 dark:bg-rose-950",
    text: "text-rose-600 dark:text-rose-400",
  },
  repayment_late: {
    icon: ClockAlert,
    bg: "bg-orange-100 dark:bg-orange-950",
    text: "text-orange-600 dark:text-orange-400",
  },
  loan_overdue: {
    icon: ClockAlert,
    bg: "bg-red-100 dark:bg-red-950",
    text: "text-red-600 dark:text-red-400",
  },
  verification_approved: {
    icon: ShieldCheck,
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  verification_rejected: {
    icon: ShieldAlert,
    bg: "bg-rose-100 dark:bg-rose-950",
    text: "text-rose-600 dark:text-rose-400",
  },
  verification_update: {
    icon: FileCheck,
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
  },
  lender_approved: {
    icon: Building2,
    bg: "bg-teal-100 dark:bg-teal-950",
    text: "text-teal-600 dark:text-teal-400",
  },
  lender_rejected: {
    icon: XCircle,
    bg: "bg-rose-100 dark:bg-rose-950",
    text: "text-rose-600 dark:text-rose-400",
  },
  lender_review_update: {
    icon: FileCheck,
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
  },
  document_accepted: {
    icon: FileCheck,
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  document_rejected: {
    icon: FileCheck,
    bg: "bg-rose-100 dark:bg-rose-950",
    text: "text-rose-600 dark:text-rose-400",
  },
  application_submitted: {
    icon: FileText,
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
  },
  application_withdrawn: {
    icon: XCircle,
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
  },
  application_updated: {
    icon: FileText,
    bg: "bg-sky-100 dark:bg-sky-950",
    text: "text-sky-600 dark:text-sky-400",
  },
  verification_document_submitted: {
    icon: Upload,
    bg: "bg-indigo-100 dark:bg-indigo-950",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  lender_onboarding_submitted: {
    icon: Building2,
    bg: "bg-indigo-100 dark:bg-indigo-950",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  loan_restored_active: {
    icon: CheckCircle,
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  loan_paid: {
    icon: CircleCheckBig,
    bg: "bg-green-100 dark:bg-green-950",
    text: "text-green-600 dark:text-green-400",
  },
};

const accentBorderMap: Record<string, string> = {
  offer_received: "border-l-blue-500",
  offer_accepted: "border-l-emerald-500",
  offer_declined: "border-l-rose-500",
  repayment_proof_submitted: "border-l-amber-500",
  repayment_verified: "border-l-emerald-500",
  repayment_rejected: "border-l-rose-500",
  repayment_late: "border-l-orange-500",
  loan_overdue: "border-l-red-500",
  verification_approved: "border-l-emerald-500",
  verification_rejected: "border-l-rose-500",
  verification_update: "border-l-slate-400",
  lender_approved: "border-l-teal-500",
  lender_rejected: "border-l-rose-500",
  lender_review_update: "border-l-slate-400",
  document_accepted: "border-l-emerald-500",
  document_rejected: "border-l-rose-500",
  application_submitted: "border-l-blue-500",
  application_withdrawn: "border-l-zinc-400",
  application_updated: "border-l-sky-500",
  verification_document_submitted: "border-l-indigo-500",
  lender_onboarding_submitted: "border-l-indigo-500",
  loan_restored_active: "border-l-emerald-500",
  loan_paid: "border-l-green-500",
};

export function NotificationItem({
  notification,
  isActive,
  onOpen,
}: {
  notification: AppNotification;
  isActive: boolean;
  onOpen: (notification: AppNotification) => void;
}) {
  const config = categoryConfig[notification.type] ?? {
    icon: CircleDollarSign,
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
  };
  const Icon = config.icon;
  const accentBorder = accentBorderMap[notification.type] ?? "border-l-slate-400";

  return (
    <button
      type="button"
      onClick={() => void onOpen(notification)}
      disabled={isActive}
      className={cn(
        "group grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 text-left transition",
        "hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring disabled:opacity-70",
        "border-l-[3px]",
        notification.isUnread
          ? cn("bg-primary/[0.03]", accentBorder)
          : "border-l-transparent",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          config.bg,
        )}
      >
        {isActive ? (
          <Loader2 className={cn("size-4 animate-spin", config.text)} />
        ) : (
          <Icon aria-hidden="true" className={cn("size-4", config.text)} />
        )}
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "text-sm",
              notification.isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/80",
            )}
          >
            {notification.title}
          </span>
          <NotificationTypeBadge type={notification.type} />
        </span>
        <span className="text-sm leading-5 text-muted-foreground line-clamp-2">
          {notification.message}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {formatNotificationDate(notification.createdAt)}
          {notification.isUnread ? (
            <span className="font-semibold text-primary">Unread</span>
          ) : null}
        </span>
      </span>
      {notification.href ? (
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
      ) : null}
    </button>
  );
}
